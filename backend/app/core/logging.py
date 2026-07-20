import logging
import sys

_REDACT_KEYS = {"password", "token", "access_token", "refresh_token", "api_key", "authorization"}


class RedactFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        msg = record.getMessage().lower()
        if any(key in msg for key in _REDACT_KEYS):
            record.msg = "[redacted log message containing sensitive key]"
            record.args = ()
        return True


def configure_logging(level: str = "INFO") -> None:
    root = logging.getLogger()
    root.setLevel(level)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
    )
    handler.addFilter(RedactFilter())
    root.handlers = [handler]
