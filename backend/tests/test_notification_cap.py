from types import SimpleNamespace

from app.services import notification_service as ns


def _m(lost, score, notified=None):
    return SimpleNamespace(lost_item_id=lost, final_score=score, notified_at=notified)


def test_caps_per_lost_item_keeping_highest_scores():
    matches = [_m("a", s / 100) for s in range(80, 95)]  # 15 matches for one lost item
    notify, suppressed = ns.plan_notifications(matches, already_today={}, cap=3)
    assert [m.final_score for m in notify] == [0.94, 0.93, 0.92]
    assert len(suppressed) == 12


def test_cap_is_per_lost_item():
    matches = [_m("a", 0.9), _m("a", 0.85), _m("b", 0.8)]
    notify, suppressed = ns.plan_notifications(matches, already_today={}, cap=1)
    assert {m.lost_item_id for m in notify} == {"a", "b"}
    assert [m.final_score for m in suppressed] == [0.85]


def test_notifications_already_sent_today_count_against_cap():
    matches = [_m("a", 0.9), _m("a", 0.85)]
    notify, suppressed = ns.plan_notifications(matches, already_today={"a": 2}, cap=3)
    assert len(notify) == 1 and len(suppressed) == 1
    notify, suppressed = ns.plan_notifications(matches, already_today={"a": 3}, cap=3)
    assert notify == [] and len(suppressed) == 2


def test_already_notified_matches_are_ignored():
    done = _m("a", 0.95, notified="2026-10-01")
    notify, suppressed = ns.plan_notifications([done, _m("a", 0.8)], already_today={}, cap=3)
    assert len(notify) == 1 and suppressed == []
