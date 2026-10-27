const buggy = `def merge_busy(intervals):
    """Merge overlapping [start, end) busy intervals (minutes). Touching intervals merge too."""
    merged = []
    for start, end in intervals:
        if merged and start < merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged


def free_slots(busy, day_start, day_end, min_len):
    """Free gaps of at least \`min_len\` minutes between day_start and day_end."""
    slots = []
    cursor = day_start
    for start, end in merge_busy(busy):
        if start - cursor > min_len:
            slots.append((cursor, start))
        cursor = end
    if day_end - cursor > min_len:
        slots.append((cursor, day_end))
    return slots


def drop_cancelled(meetings):
    """Remove meetings whose status is 'cancelled' (in place) and return the list."""
    for m in meetings:
        if m["status"] is "cancelled":
            meetings.remove(m)
    return meetings
`;

const fixed = `def merge_busy(intervals):
    """Merge overlapping [start, end) busy intervals (minutes). Touching intervals merge too."""
    merged = []
    for start, end in sorted(intervals):
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged


def free_slots(busy, day_start, day_end, min_len):
    """Free gaps of at least \`min_len\` minutes between day_start and day_end."""
    slots = []
    cursor = day_start
    for start, end in merge_busy(busy):
        if start - cursor >= min_len:
            slots.append((cursor, start))
        cursor = max(cursor, end)
    if day_end - cursor >= min_len:
        slots.append((cursor, day_end))
    return slots


def drop_cancelled(meetings):
    """Remove meetings whose status is 'cancelled' (in place) and return the list."""
    meetings[:] = [m for m in meetings if m["status"] != "cancelled"]
    return meetings
`;

const tests = `import unittest

from cal.scheduler import merge_busy, free_slots, drop_cancelled


class SchedulerTests(unittest.TestCase):
    def test_merge_unsorted_input(self):
        self.assertEqual(merge_busy([[60, 90], [0, 30], [20, 40]]), [[0, 40], [60, 90]])

    def test_touching_intervals_merge(self):
        self.assertEqual(merge_busy([[0, 30], [30, 60]]), [[0, 60]])

    def test_free_slots_inclusive_min_length(self):
        # 9:00-17:00 in minutes = 540-1020
        busy = [[600, 660], [540, 570], [900, 1020]]
        self.assertEqual(free_slots(busy, 540, 1020, 30), [(570, 600), (660, 900)])

    def test_free_slot_at_end_of_day(self):
        self.assertEqual(free_slots([[540, 990]], 540, 1020, 30), [(990, 1020)])

    def test_drop_cancelled_removes_all_adjacent(self):
        ms = [{"id": 1, "status": "cancelled"}, {"id": 2, "status": "cancelled"}, {"id": 3, "status": "ok"}]
        out = drop_cancelled(ms)
        self.assertEqual([m["id"] for m in out], [3])
        self.assertIs(out, ms)

    def test_drop_cancelled_with_built_strings(self):
        status = "".join(["can", "celled"])
        ms = [{"id": 1, "status": status}, {"id": 2, "status": "ok"}]
        self.assertEqual([m["id"] for m in drop_cancelled(ms)], [2])
`;

export default {
  slug: "py-meeting-scheduler",
  order: 23,
  lang: "py",
  title: "Python: Meeting Scheduler",
  difficulty: "Medium",
  minutes: 20,
  tagline: "Free-time finder offers slots that are actually busy.",
  ticket: `**CAL-8 · "Find a time" suggests busy slots**

Calendar sync passes busy intervals **unsorted**. The free-slot finder then suggests times that are already booked, misses 30-minute slots when \`min_len=30\`, and \`drop_cancelled\` leaves some cancelled meetings behind.`,
  env: {},
  files: { "cal/scheduler.py": buggy },
  tests: { "tests/test_scheduler.py": tests },
  fixes: { "cal/scheduler.py": fixed },
  bugs: [
    { file: "cal/scheduler.py", title: "merge assumes sorted input", explain: "The classic merge-intervals algorithm only works on intervals sorted by start. Iterate `sorted(intervals)`." },
    { file: "cal/scheduler.py", title: "boundary comparisons", explain: "Touching intervals should merge (`<=`), and a gap of exactly `min_len` qualifies (`>=`)." },
    { file: "cal/scheduler.py", title: "removing from a list while iterating it", explain: "`list.remove` shifts elements left and the iterator skips the next one. Rebuild the list (`meetings[:] = [...]` keeps it in place)." },
    { file: "cal/scheduler.py", title: "`is` compares identity, not value", explain: "Strings built at runtime are different objects. Use `==` / `!=` for value equality." },
  ],
  hints: ["Does merge work if the 3rd interval starts before the 1st?", "Is a 30-minute gap a valid 30-minute slot?", "What happens to the index when you remove during a for loop?"],
  concepts: ["merge intervals", "boundaries", "mutation during iteration", "is vs =="],
};
