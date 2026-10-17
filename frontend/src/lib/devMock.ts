/**
 * 로컬 개발 전용 목(mock) 백엔드.
 * `next dev`에서만 동작하며(NODE_ENV === "development"), 프로덕션 빌드에서는 호출 경로가 제거된다.
 * 로그인 시 DEV_MOCK_TOKEN이 저장되면 apiFetch가 네트워크 대신 이 모듈로 응답한다.
 */

const STORE_KEY = "refind_dev_mock_store";

interface LostRaw {
  id: string;
  title: string;
  category_code: string;
  custom_category: string | null;
  color_codes: string[];
  custom_color_text: string | null;
  lost_date: string;
  region_code: string;
  place_text: string | null;
  description: string | null;
  image_url: string | null;
  status: "ACTIVE" | "FOUND" | "CLOSED";
  closure_reason: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface NotificationRaw {
  id: string;
  lost_item_id: string;
  match_id: string;
  channel: "IN_APP" | "EMAIL";
  status: "PENDING" | "SENT" | "FAILED" | "READ";
  sent_at: string | null;
  read_at: string | null;
  created_at: string;
}

interface Store {
  lost: LostRaw[];
  notifications: NotificationRaw[];
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const dateStr = (n: number) => daysAgo(n).toISOString().slice(0, 10);

function seed(): Store {
  const base = {
    custom_category: null,
    custom_color_text: null,
    image_url: null,
    closure_reason: null,
    closed_at: null,
  };
  return {
    lost: [
      {
        ...base,
        id: "dev-lost-1",
        title: "검은색 카드지갑",
        category_code: "WALLET",
        color_codes: ["BLACK"],
        lost_date: dateStr(3),
        region_code: "11",
        place_text: "강남역 2번 출구 근처 버스정류장",
        description: "가죽 재질, 안쪽에 학생증과 체크카드 2장이 들어 있어요.",
        status: "ACTIVE",
        created_at: daysAgo(3).toISOString(),
        updated_at: daysAgo(3).toISOString(),
      },
      {
        ...base,
        id: "dev-lost-2",
        title: "에어팟 프로 케이스",
        category_code: "EARPHONE",
        color_codes: ["WHITE", "SILVER"],
        lost_date: dateStr(9),
        region_code: "29",
        place_text: "조선대학교 중앙도서관 2층",
        description: "케이스에 작은 스크래치가 있고 스티커가 붙어 있어요.",
        status: "ACTIVE",
        created_at: daysAgo(9).toISOString(),
        updated_at: daysAgo(9).toISOString(),
      },
      {
        ...base,
        id: "dev-lost-3",
        title: "남색 우산",
        category_code: "UMBRELLA",
        color_codes: ["NAVY"],
        lost_date: dateStr(20),
        region_code: "41",
        place_text: null,
        description: null,
        status: "CLOSED",
        closure_reason: "FOUND_ELSEWHERE",
        closed_at: daysAgo(14).toISOString(),
        created_at: daysAgo(20).toISOString(),
        updated_at: daysAgo(14).toISOString(),
      },
    ],
    notifications: [
      {
        id: "dev-noti-1",
        lost_item_id: "dev-lost-1",
        match_id: "dev-match-1",
        channel: "IN_APP",
        status: "SENT",
        sent_at: daysAgo(0).toISOString(),
        read_at: null,
        created_at: daysAgo(0).toISOString(),
      },
      {
        id: "dev-noti-2",
        lost_item_id: "dev-lost-2",
        match_id: "dev-match-2",
        channel: "EMAIL",
        status: "READ",
        sent_at: daysAgo(2).toISOString(),
        read_at: daysAgo(1).toISOString(),
        created_at: daysAgo(2).toISOString(),
      },
    ],
  };
}

function load(): Store {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch {
    /* fall through to seed */
  }
  const fresh = seed();
  save(fresh);
  return fresh;
}

function save(store: Store) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota/private mode */
  }
}

const FOUND = [
  ["검정 가죽 카드지갑", "WALLET", ["BLACK"], "11", "강남역 인근 버스정류장", "강남경찰서 유실물센터", 0.92, "HIGH"],
  ["검정색 지갑", "WALLET", ["BLACK", "GRAY"], "11", "서울 지하철 2호선 강남역", "서울교통공사 유실물센터", 0.81, "HIGH"],
  ["카드 케이스(갈색)", "WALLET", ["BROWN"], "11", "역삼동 편의점 앞", "역삼파출소", 0.66, "MEDIUM"],
  ["학생증이 든 파우치", "BAG", ["BLACK"], "11", "서초구 도서관", "서초경찰서", 0.58, "MEDIUM"],
  ["명함지갑", "WALLET", ["SILVER"], "11", "신논현역 3번 출구", "서울교통공사 유실물센터", 0.52, "LOW"],
] as const;

function foundRaw(index: number) {
  const f = FOUND[index];
  return {
    id: `dev-found-${index + 1}`,
    source: "LOST112" as const,
    title: f[0],
    category_code: f[1],
    color_codes: [...f[2]],
    found_date: dateStr(index + 1),
    region_code: f[3],
    place_text: f[4],
    storage_place: f[5],
    contact_text: "02-0000-0000",
    description: "개발용 예시 데이터입니다. 실제 습득물이 아닙니다.",
    image_url: null,
    status: "STORED" as const,
  };
}

function matchesFor(lostId: string, store: Store) {
  const reasonsBy = (i: number) =>
    i < 2 ? ["종류 일치", "색상 일치", "같은 지역", "설명 유사"] : i < 4 ? ["종류 일치", "같은 지역"] : ["같은 지역"];
  const base = {
    items: FOUND.map((f, i) => ({
      match_id: `dev-match-${lostId}-${i + 1}`,
      score: f[6],
      score_label: f[7],
      reasons: reasonsBy(i),
      score_breakdown: {
        text: Math.min(1, f[6] + 0.03),
        image: null,
        category: i < 4 ? 1 : 0.4,
        color: i < 2 ? 1 : 0.5,
        location: 0.9,
        date: Math.max(0.3, 1 - i * 0.12),
      },
      found_item: foundRaw(i),
    })),
  };
  // 개발용으로 생성된 알림의 매칭도 조회되도록 추가한다.
  store.notifications
    .filter((n) => n.lost_item_id === lostId && !base.items.some((m) => m.match_id === n.match_id))
    .forEach((n, k) => {
      const template = base.items[k % 3];
      base.items.push({ ...template, match_id: n.match_id });
    });
  return base;
}

export class DevMockMiss extends Error {}

/** 처리할 수 없는 경로면 DevMockMiss를 던진다. */
export async function devMockFetch(path: string, method: string, body: unknown): Promise<unknown> {
  await new Promise((r) => setTimeout(r, 250));
  const store = load();
  let m: RegExpMatchArray | null;

  if (path === "/auth/me") {
    return { id: "dev-user", email: "dev@refind.local", name: "개발자", role: "USER" };
  }

  if (path === "/lost-items" && method === "GET") {
    return [...store.lost].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  if (path === "/lost-items" && method === "POST" && body instanceof FormData) {
    const now = new Date().toISOString();
    const colors = JSON.parse(String(body.get("color_codes") ?? "[]")) as string[];
    const created: LostRaw = {
      id: `dev-lost-${Date.now()}`,
      title: String(body.get("title") ?? ""),
      category_code: String(body.get("category_code") ?? "ETC"),
      custom_category: (body.get("custom_category") as string | null) ?? null,
      color_codes: colors,
      custom_color_text: (body.get("custom_color_text") as string | null) ?? null,
      lost_date: String(body.get("lost_date") ?? dateStr(0)),
      region_code: String(body.get("region_code") ?? "11"),
      place_text: (body.get("place_text") as string) || null,
      description: (body.get("description") as string) || null,
      image_url: null,
      status: "ACTIVE",
      closure_reason: null,
      closed_at: null,
      created_at: now,
      updated_at: now,
    };
    store.lost.unshift(created);
    save(store);
    return created;
  }

  if ((m = path.match(/^\/lost-items\/([^/]+)$/)) && method === "GET") {
    const found = store.lost.find((i) => i.id === m![1]);
    if (!found) throw new DevMockMiss();
    return found;
  }

  if ((m = path.match(/^\/lost-items\/([^/]+)\/close$/)) && method === "POST") {
    const found = store.lost.find((i) => i.id === m![1]);
    if (!found) throw new DevMockMiss();
    const reason = (body as { reason: string }).reason;
    found.status = reason === "MATCHED_BY_REFIND" || reason === "FOUND_ELSEWHERE" ? "FOUND" : "CLOSED";
    found.closure_reason = reason;
    found.closed_at = found.updated_at = new Date().toISOString();
    save(store);
    return found;
  }

  if ((m = path.match(/^\/lost-items\/([^/]+)\/matches$/))) {
    return matchesFor(m[1], store);
  }

  if ((m = path.match(/^\/found-items\/dev-found-(\d)$/))) {
    const idx = Number(m[1]) - 1;
    if (!FOUND[idx]) throw new DevMockMiss();
    return foundRaw(idx);
  }

  if (path === "/notifications" && method === "GET") {
    // 개발용: 20초마다 새 알림이 도착한 것처럼 만들어 토스트를 확인할 수 있게 한다.
    const newest = store.notifications.reduce((t, n) => Math.max(t, Date.parse(n.created_at)), 0);
    const active = store.lost.filter((i) => i.status === "ACTIVE");
    if (active.length > 0 && Date.now() - newest > 20_000) {
      const target = active[Math.floor(Math.random() * active.length)];
      const now = new Date().toISOString();
      store.notifications.unshift({
        id: `dev-noti-${Date.now()}`,
        lost_item_id: target.id,
        match_id: `dev-match-${target.id}-${1 + Math.floor(Math.random() * 3)}-${Date.now()}`,
        channel: "IN_APP",
        status: "SENT",
        sent_at: now,
        read_at: null,
        created_at: now,
      });
      save(store);
    }
    return store.notifications;
  }

  if ((m = path.match(/^\/notifications\/([^/]+)\/read$/)) && method === "PATCH") {
    const n = store.notifications.find((x) => x.id === m![1]);
    if (n) {
      n.status = "READ";
      n.read_at = new Date().toISOString();
      save(store);
    }
    return undefined;
  }

  throw new DevMockMiss();
}
