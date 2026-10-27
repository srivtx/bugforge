const buggy = `from decimal import Decimal


class InsufficientFunds(Exception):
    pass


class Account:
    history = []  # list of (kind, amount) tuples

    def __init__(self, owner, balance=0.0, tags=[]):
        self.owner = owner
        self.balance = balance
        self.tags = tags
        self.tags.append("new")

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("amount must be positive")
        self.balance += amount
        self.history.append(("deposit", amount))

    def withdraw(self, amount):
        if amount > self.balance:
            raise InsufficientFunds(self.owner)
        self.balance -= amount
        self.history.append(("withdraw", amount))


def transfer(src, dst, amount):
    """Move money atomically: either both sides change or neither does."""
    src.withdraw(amount)
    if dst is None:
        raise ValueError("unknown destination")
    dst.deposit(amount)
`;

const fixed = `from decimal import Decimal


class InsufficientFunds(Exception):
    pass


class Account:
    def __init__(self, owner, balance="0", tags=None):
        self.owner = owner
        self.balance = Decimal(str(balance))
        self.history = []  # list of (kind, amount) tuples
        self.tags = list(tags) if tags else []
        self.tags.append("new")

    def deposit(self, amount):
        amount = Decimal(str(amount))
        if amount <= 0:
            raise ValueError("amount must be positive")
        self.balance += amount
        self.history.append(("deposit", amount))

    def withdraw(self, amount):
        amount = Decimal(str(amount))
        if amount <= 0:
            raise ValueError("amount must be positive")
        if amount > self.balance:
            raise InsufficientFunds(self.owner)
        self.balance -= amount
        self.history.append(("withdraw", amount))


def transfer(src, dst, amount):
    """Move money atomically: either both sides change or neither does."""
    if dst is None:
        raise ValueError("unknown destination")
    src.withdraw(amount)
    dst.deposit(amount)
`;

const tests = `import unittest
from decimal import Decimal

from bank.ledger import Account, transfer, InsufficientFunds


class LedgerTests(unittest.TestCase):
    def test_balances_are_exact_decimals(self):
        """0.1 + 0.2 must be exactly 0.3"""
        a = Account("ana")
        a.deposit("0.1")
        a.deposit("0.2")
        self.assertEqual(a.balance, Decimal("0.3"))

    def test_history_is_per_account(self):
        a, b = Account("ana"), Account("bo")
        a.deposit(5)
        self.assertEqual(len(a.history), 1)
        self.assertEqual(b.history, [])

    def test_tags_are_not_shared(self):
        a, b = Account("ana"), Account("bo")
        self.assertEqual(a.tags, ["new"])
        self.assertEqual(b.tags, ["new"])

    def test_cannot_withdraw_negative(self):
        a = Account("ana", 10)
        with self.assertRaises(ValueError):
            a.withdraw(-5)
        self.assertEqual(a.balance, Decimal("10"))

    def test_insufficient_funds(self):
        a = Account("ana", 10)
        with self.assertRaises(InsufficientFunds):
            a.withdraw(11)

    def test_transfer_is_atomic_on_bad_destination(self):
        a = Account("ana", 50)
        with self.assertRaises(ValueError):
            transfer(a, None, 20)
        self.assertEqual(a.balance, Decimal("50"))

    def test_transfer_moves_money(self):
        a, b = Account("ana", 50), Account("bo")
        transfer(a, b, "12.35")
        self.assertEqual((a.balance, b.balance), (Decimal("37.65"), Decimal("12.35")))


if __name__ == "__main__":
    unittest.main()
`;

export default {
  slug: "py-bank-ledger",
  order: 20,
  lang: "py",
  title: "Python: Bank Ledger Integrity",
  difficulty: "Medium",
  minutes: 25,
  tagline: "Every account shares one history, and money vanishes in failed transfers.",
  ticket: `**FIN-12 · Ledger audit failed**

Auditors found three problems in \`bank/ledger.py\`:

1. Opening a new account shows **other customers' transactions** in its history (and tags).
2. Balances drift: \`0.1 + 0.2\` shows as \`0.30000000000000004\`.
3. A transfer to an unknown account **debited the sender** anyway, and someone withdrew a **negative** amount to mint money.

Make \`tests/test_ledger.py\` pass. This is plain Python (\`unittest\`).`,
  env: {},
  files: { "bank/ledger.py": buggy },
  tests: { "tests/test_ledger.py": tests },
  fixes: { "bank/ledger.py": fixed },
  bugs: [
    { file: "bank/ledger.py", title: "class attribute shared by all instances", explain: "`history = []` at class level is **one list** shared by every Account. Create it in `__init__` as `self.history = []`." },
    { file: "bank/ledger.py", title: "mutable default argument", explain: "`tags=[]` is evaluated **once** when the function is defined, so every call shares it. Use `tags=None` and create a new list." },
    { file: "bank/ledger.py", title: "floats for money", explain: "Binary floats can't represent 0.1 exactly. Use `Decimal(str(x))`, which also accepts ints and strings." },
    { file: "bank/ledger.py", title: "validation after side effects", explain: "Validate everything (destination, positive amount) **before** mutating state. Otherwise a failure leaves a half-done transfer." },
  ],
  hints: ["Where does `history` live: the instance or the class?", "When is a default argument value created in Python?", "What happens to src.balance if dst is None?"],
  concepts: ["class vs instance attributes", "mutable defaults", "Decimal money", "atomicity / validate-first"],
};
