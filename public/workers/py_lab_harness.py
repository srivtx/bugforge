# Runs unittest-based Python labs and returns JSON results.
# Used both by the browser (Pyodide) and by the build-time verifier (CPython).
import io
import json
import sys
import time
import traceback
import unittest


def _short_tb(err):
    etype, value, tb = err
    frames = traceback.extract_tb(tb)
    user = [f for f in frames if "unittest" not in f.filename and "py_lab_harness" not in f.filename]
    loc = ""
    if user:
        f = user[-1]
        loc = f"\n    at {f.filename.split('/lab/')[-1]}:{f.lineno}  ->  {f.line}"
    msg = str(value)
    if etype is AssertionError and not msg:
        msg = "assertion failed"
    return f"{etype.__name__}: {msg}{loc}"


class _Collector(unittest.TestResult):
    def __init__(self):
        super().__init__()
        self.rows = []
        self._t0 = 0.0

    def startTest(self, test):
        super().startTest(test)
        self._t0 = time.perf_counter()

    def _name(self, test):
        cls = test.__class__.__name__
        doc = test.shortDescription()
        meth = test._testMethodName
        return f"{cls} › {doc or meth.replace('test_', '').replace('_', ' ')}"

    def _file(self, test):
        mod = test.__class__.__module__
        return mod.replace(".", "/") + ".py"

    def addSuccess(self, test):
        self.rows.append({"file": self._file(test), "name": self._name(test), "status": "pass", "ms": (time.perf_counter() - self._t0) * 1000})

    def addFailure(self, test, err):
        self.rows.append({"file": self._file(test), "name": self._name(test), "status": "fail", "error": _short_tb(err), "ms": (time.perf_counter() - self._t0) * 1000})

    def addError(self, test, err):
        self.addFailure(test, err)


def run_lab(root, test_modules):
    sys.path.insert(0, root)
    # drop cached lab modules so edits are picked up
    for name in list(sys.modules):
        mod = sys.modules[name]
        f = getattr(mod, "__file__", "") or ""
        if f.startswith(root):
            del sys.modules[name]
    logs = io.StringIO()
    old = sys.stdout
    sys.stdout = logs
    rows = []
    load_error = None
    try:
        loader = unittest.TestLoader()
        for m in test_modules:
            try:
                suite = loader.loadTestsFromName(m)
            except Exception:
                load_error = traceback.format_exc(limit=3)
                rows.append({"file": m.replace(".", "/") + ".py", "name": "Test module failed to import", "status": "fail", "error": load_error.strip().splitlines()[-1] + "\n" + "\n".join(load_error.strip().splitlines()[-4:-1]), "ms": 0})
                continue
            res = _Collector()
            suite.run(res)
            rows.extend(res.rows)
    finally:
        sys.stdout = old
        if sys.path and sys.path[0] == root:
            sys.path.pop(0)
    out_logs = [{"test": None, "level": "log", "text": line} for line in logs.getvalue().splitlines()[:300]]
    return json.dumps({"tests": rows, "logs": out_logs, "loadError": load_error})
