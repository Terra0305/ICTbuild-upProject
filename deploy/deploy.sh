#!/bin/bash
# Deploy the backend on the EC2 host. Run as root (SSM Run Command).
#
# Usage: deploy.sh <api-image>
# Per-environment settings come from environment variables:
#   FRONTEND_URL, CORS_ORIGIN_REGEX, STORAGE_BUCKET, STORAGE_PUBLIC_BASE_URL
# Secrets are read from Secrets Manager with the instance role and written
# straight to .env; they are never printed. Do not add `set -x` here.
set -euo pipefail

API_IMAGE="${1:?usage: deploy.sh <api-image>}"
APP_DIR=/opt/refind
SECRET_ID="${SECRET_ID:-refind/backend}"
AWS_REGION="${AWS_REGION:-ap-northeast-2}"
LOST112_BASE_URL="${LOST112_BASE_URL:-https://apis.data.go.kr/1320000/LosfundInfoInqireService}"
: "${FRONTEND_URL:?FRONTEND_URL is required}"
: "${STORAGE_BUCKET:?STORAGE_BUCKET is required}"
: "${STORAGE_PUBLIC_BASE_URL:?STORAGE_PUBLIC_BASE_URL is required}"

cd "$APP_DIR"
COMPOSE=(docker compose -f docker-compose.prod.yml)

# --- .env -----------------------------------------------------------------
umask 077
tmp_env="$(mktemp "$APP_DIR/.env.XXXXXX")"
trap 'rm -f "$tmp_env"' EXIT

aws secretsmanager get-secret-value \
  --secret-id "$SECRET_ID" --region "$AWS_REGION" \
  --query SecretString --output text \
  | python3 -c '
import json, re, sys
required = ("LOST112_SERVICE_KEY", "JWT_SECRET", "POSTGRES_PASSWORD", "SYNC_CRON_SECRET")
quote = chr(39)
secret = json.load(sys.stdin)
missing = [key for key in required if not secret.get(key)]
if missing:
    sys.exit("secret is missing keys: " + ", ".join(missing))
# The password is embedded unencoded in DATABASE_URL, and alembic passes that URL
# through configparser, so percent-encoding is not an option either.
if not re.fullmatch(r"[A-Za-z0-9_-]+", str(secret["POSTGRES_PASSWORD"])):
    sys.exit("secret key POSTGRES_PASSWORD must only contain A-Z a-z 0-9 _ -")
for key in required:
    value = str(secret[key])
    # Single-quoted .env values are taken literally by Compose ($, #, spaces).
    if "\n" in value or quote in value:
        sys.exit(f"secret key {key} contains a newline or single quote, which .env cannot hold safely")
    print(f"{key}={quote}{value}{quote}")
' > "$tmp_env"

# Single quotes keep the regex's $ and backslashes literal for Compose.
case "${CORS_ORIGIN_REGEX:-}" in *"'"*) echo "CORS_ORIGIN_REGEX must not contain '" >&2; exit 1 ;; esac
cat >> "$tmp_env" <<ENV
API_IMAGE=$API_IMAGE
FRONTEND_URL=$FRONTEND_URL
CORS_ORIGIN_REGEX='${CORS_ORIGIN_REGEX:-}'
LOST112_BASE_URL=$LOST112_BASE_URL
STORAGE_BUCKET=$STORAGE_BUCKET
STORAGE_REGION=$AWS_REGION
STORAGE_PUBLIC_BASE_URL=$STORAGE_PUBLIC_BASE_URL
ENV
mv "$tmp_env" .env
trap - EXIT

# --- containers -----------------------------------------------------------
"${COMPOSE[@]}" pull --quiet
"${COMPOSE[@]}" up -d --remove-orphans

echo "Waiting for the API to become healthy..."
status=""
for _ in $(seq 1 30); do
  status="$(docker inspect -f '{{.State.Health.Status}}' "$("${COMPOSE[@]}" ps -q api)" 2>/dev/null || true)"
  if [ "$status" = "healthy" ]; then
    break
  fi
  sleep 5
done
if [ "$status" != "healthy" ]; then
  echo "API did not become healthy (status: ${status:-unknown})" >&2
  "${COMPOSE[@]}" logs --tail 50 api >&2
  exit 1
fi

# Each deploy leaves a <sha>-tagged image; drop unused ones older than 3 days.
docker image prune -af --filter "until=72h" >/dev/null

# --- daily LOST112 sync (04:00 KST = 19:00 UTC) ---------------------------
cat > /etc/cron.d/refind-sync <<CRON
0 19 * * * root cd $APP_DIR && docker compose -f docker-compose.prod.yml exec -T api python -m scripts.sync_lost112_recent --days 1 2>&1 | logger -t refind-sync
CRON
chmod 644 /etc/cron.d/refind-sync

echo "Deployed $API_IMAGE"
