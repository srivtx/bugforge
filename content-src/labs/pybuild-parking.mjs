const stub = `from enum import IntEnum


class Size(IntEnum):
    MOTORCYCLE = 1
    CAR = 2
    VAN = 3


class ParkingLot:
    """Object-oriented parking lot.

    ParkingLot({Size.MOTORCYCLE: 2, Size.CAR: 3, Size.VAN: 1})  spots per size

    park(plate, size) -> spot id like "CAR-0"; a vehicle takes the SMALLEST free spot that fits
                         (a spot fits if spot size >= vehicle size), lowest index first.
                         Returns None if no spot fits. Parking an already-parked plate raises ValueError.
    leave(plate)      -> the freed spot id; KeyError if the plate isn't parked
    available(size)   -> number of free spots of exactly that size
    where(plate)      -> spot id or None
    """

    def __init__(self, spots):
        pass  # TODO

    def park(self, plate, size):
        raise NotImplementedError

    def leave(self, plate):
        raise NotImplementedError

    def available(self, size):
        raise NotImplementedError

    def where(self, plate):
        raise NotImplementedError
`;

const solution = `import heapq
from enum import IntEnum


class Size(IntEnum):
    MOTORCYCLE = 1
    CAR = 2
    VAN = 3


class ParkingLot:
    """Object-oriented parking lot.

    ParkingLot({Size.MOTORCYCLE: 2, Size.CAR: 3, Size.VAN: 1})  spots per size

    park(plate, size) -> spot id like "CAR-0"; a vehicle takes the SMALLEST free spot that fits
                         (a spot fits if spot size >= vehicle size), lowest index first.
                         Returns None if no spot fits. Parking an already-parked plate raises ValueError.
    leave(plate)      -> the freed spot id; KeyError if the plate isn't parked
    available(size)   -> number of free spots of exactly that size
    where(plate)      -> spot id or None
    """

    def __init__(self, spots):
        # one min-heap of free indices per size -> O(log n) park/leave
        self.free = {size: list(range(n)) for size, n in spots.items()}
        for h in self.free.values():
            heapq.heapify(h)
        self.parked = {}  # plate -> (size, index)

    def park(self, plate, size):
        if plate in self.parked:
            raise ValueError(f"{plate} already parked")
        for spot_size in sorted(self.free):
            if spot_size >= size and self.free[spot_size]:
                idx = heapq.heappop(self.free[spot_size])
                self.parked[plate] = (spot_size, idx)
                return f"{Size(spot_size).name}-{idx}"
        return None

    def leave(self, plate):
        spot_size, idx = self.parked.pop(plate)
        heapq.heappush(self.free[spot_size], idx)
        return f"{Size(spot_size).name}-{idx}"

    def available(self, size):
        return len(self.free.get(size, []))

    def where(self, plate):
        if plate not in self.parked:
            return None
        spot_size, idx = self.parked[plate]
        return f"{Size(spot_size).name}-{idx}"
`;

const tests = `import unittest

from lot.parking import ParkingLot, Size


def lot():
    return ParkingLot({Size.MOTORCYCLE: 1, Size.CAR: 2, Size.VAN: 1})


class ParkingTests(unittest.TestCase):
    def test_vehicle_takes_matching_size(self):
        p = lot()
        self.assertEqual(p.park("C1", Size.CAR), "CAR-0")
        self.assertEqual(p.park("M1", Size.MOTORCYCLE), "MOTORCYCLE-0")

    def test_falls_back_to_next_bigger_spot(self):
        p = lot()
        p.park("M1", Size.MOTORCYCLE)
        self.assertEqual(p.park("M2", Size.MOTORCYCLE), "CAR-0")

    def test_never_uses_smaller_spot(self):
        p = lot()
        p.park("V1", Size.VAN)
        self.assertIsNone(p.park("V2", Size.VAN))

    def test_lowest_free_index_is_reused(self):
        p = lot()
        p.park("A", Size.CAR); p.park("B", Size.CAR)
        self.assertEqual(p.leave("A"), "CAR-0")
        self.assertEqual(p.park("C", Size.CAR), "CAR-0")

    def test_available_counts(self):
        p = lot()
        p.park("A", Size.CAR)
        self.assertEqual((p.available(Size.CAR), p.available(Size.VAN)), (1, 1))

    def test_double_park_and_unknown_leave(self):
        p = lot()
        p.park("A", Size.CAR)
        with self.assertRaises(ValueError):
            p.park("A", Size.CAR)
        with self.assertRaises(KeyError):
            p.leave("ZZZ")

    def test_where(self):
        p = lot()
        p.park("A", Size.VAN)
        self.assertEqual(p.where("A"), "VAN-0")
        self.assertIsNone(p.where("B"))
`;

export default {
  slug: "pybuild-parking-lot",
  order: 111,
  kind: "build",
  lang: "py",
  title: "Build (Python): Parking Lot OOD",
  difficulty: "Medium",
  minutes: 30,
  tagline: "The most famous object-oriented design question, implemented and tested.",
  ticket: `## Spec

Implement \`ParkingLot\` in \`lot/parking.py\` (contract in the docstring).

Design-round follow-ups to think about while you code: how would you support **multiple floors**, **pricing**, **reservations**, or **concurrent gates**? A min-heap of free spots per size gives O(log n) park/leave.`,
  env: {},
  files: { "lot/parking.py": stub },
  tests: { "tests/test_parking.py": tests },
  fixes: { "lot/parking.py": solution },
  bugs: [
    { file: "lot/parking.py", title: "Free-spot structure", explain: "One min-heap of free indices per size: `heapq.heappop` always yields the lowest free index." },
    { file: "lot/parking.py", title: "Best-fit search", explain: "Iterate sizes ascending, take the first size ≥ vehicle size that still has a free spot." },
    { file: "lot/parking.py", title: "Bookkeeping", explain: "`parked: plate → (size, index)` powers `leave`, `where` and the duplicate check." },
  ],
  hints: ["IntEnum members compare like ints.", "heapq turns a list into a priority queue in place."],
  concepts: ["OOD", "heaps", "enums", "invariants"],
};
