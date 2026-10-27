const stub = `class FileSystem:
    """In-memory file system with absolute paths ("/a/b/c").

    mkdir(path)                 create directory and any missing parents
    write(path, content)        create the file (and parents) or APPEND to it
    read(path) -> str           FileNotFoundError if missing; IsADirectoryError for directories
    ls(path) -> list[str]       directory: sorted child names; file: [file name]
    rm(path)                    remove a file or a directory recursively; FileNotFoundError if missing
    du(path) -> int             total characters in all files under path
    """

    def __init__(self):
        pass  # TODO

    def mkdir(self, path):
        raise NotImplementedError

    def write(self, path, content):
        raise NotImplementedError

    def read(self, path):
        raise NotImplementedError

    def ls(self, path):
        raise NotImplementedError

    def rm(self, path):
        raise NotImplementedError

    def du(self, path):
        raise NotImplementedError
`;

const solution = `class Node:
    def __init__(self, is_file=False):
        self.children = {}
        self.is_file = is_file
        self.content = ""


class FileSystem:
    """In-memory file system with absolute paths ("/a/b/c").

    mkdir(path)                 create directory and any missing parents
    write(path, content)        create the file (and parents) or APPEND to it
    read(path) -> str           FileNotFoundError if missing; IsADirectoryError for directories
    ls(path) -> list[str]       directory: sorted child names; file: [file name]
    rm(path)                    remove a file or a directory recursively; FileNotFoundError if missing
    du(path) -> int             total characters in all files under path
    """

    def __init__(self):
        self.root = Node()

    @staticmethod
    def _parts(path):
        return [p for p in path.split("/") if p]

    def _walk(self, path, create=False):
        node = self.root
        for name in self._parts(path):
            if name not in node.children:
                if not create:
                    raise FileNotFoundError(path)
                node.children[name] = Node()
            node = node.children[name]
        return node

    def mkdir(self, path):
        self._walk(path, create=True)

    def write(self, path, content):
        parts = self._parts(path)
        parent = self._walk("/".join(parts[:-1]), create=True)
        node = parent.children.setdefault(parts[-1], Node(is_file=True))
        if not node.is_file:
            raise IsADirectoryError(path)
        node.content += content

    def read(self, path):
        node = self._walk(path)
        if not node.is_file:
            raise IsADirectoryError(path)
        return node.content

    def ls(self, path):
        node = self._walk(path)
        if node.is_file:
            return [self._parts(path)[-1]]
        return sorted(node.children)

    def rm(self, path):
        parts = self._parts(path)
        parent = self._walk("/".join(parts[:-1]))
        if not parts or parts[-1] not in parent.children:
            raise FileNotFoundError(path)
        del parent.children[parts[-1]]

    def du(self, path):
        def size(n):
            return len(n.content) if n.is_file else sum(size(c) for c in n.children.values())

        return size(self._walk(path))
`;

const tests = `import unittest

from fs.memfs import FileSystem


class FsTests(unittest.TestCase):
    def setUp(self):
        self.fs = FileSystem()

    def test_mkdir_creates_parents_and_ls_sorts(self):
        self.fs.mkdir("/a/b/c")
        self.fs.mkdir("/a/aa")
        self.assertEqual(self.fs.ls("/a"), ["aa", "b"])
        self.assertEqual(self.fs.ls("/"), ["a"])

    def test_write_creates_and_appends(self):
        self.fs.write("/logs/app.log", "hello")
        self.fs.write("/logs/app.log", " world")
        self.assertEqual(self.fs.read("/logs/app.log"), "hello world")

    def test_ls_on_file(self):
        self.fs.write("/x/readme.md", "#")
        self.assertEqual(self.fs.ls("/x/readme.md"), ["readme.md"])

    def test_read_errors(self):
        self.fs.mkdir("/d")
        with self.assertRaises(FileNotFoundError):
            self.fs.read("/nope.txt")
        with self.assertRaises(IsADirectoryError):
            self.fs.read("/d")

    def test_rm_recursive(self):
        self.fs.write("/a/b/f.txt", "123")
        self.fs.rm("/a/b")
        self.assertEqual(self.fs.ls("/a"), [])
        with self.assertRaises(FileNotFoundError):
            self.fs.rm("/a/b")

    def test_du(self):
        self.fs.write("/p/one.txt", "12345")
        self.fs.write("/p/q/two.txt", "abc")
        self.assertEqual((self.fs.du("/p"), self.fs.du("/p/q"), self.fs.du("/")), (8, 3, 8))
`;

export default {
  slug: "pybuild-file-system",
  order: 112,
  kind: "build",
  lang: "py",
  title: "Build (Python): In-Memory File System",
  difficulty: "Medium",
  minutes: 30,
  tagline: "mkdir -p, append-writes, ls, rm -r and du on a tree of nodes.",
  ticket: `## Spec

Implement \`FileSystem\` in \`fs/memfs.py\` (contract in the docstring).

The core idea is a **trie of path segments**: each node has \`children: dict\`, \`is_file\` and \`content\`. Most methods are "walk the path, then do one thing". \`du\` is a recursive sum.`,
  env: {},
  files: { "fs/memfs.py": stub },
  tests: { "tests/test_memfs.py": tests },
  fixes: { "fs/memfs.py": solution },
  bugs: [
    { file: "fs/memfs.py", title: "Node model", explain: "A small `Node` class with `children`, `is_file`, `content`. The root is a directory node." },
    { file: "fs/memfs.py", title: "One _walk helper", explain: "Split the path, filter empty parts, step through `children`, optionally creating missing nodes." },
    { file: "fs/memfs.py", title: "Operations", explain: "write = walk(parent, create) + setdefault file + append; rm = delete from the parent's children; du = recursive sum." },
  ],
  hints: ["'/a/b'.split('/') gives ['', 'a', 'b']. Filter the empties.", "Recursion makes rm -r free: dropping a node drops its subtree."],
  concepts: ["tries", "recursion", "path parsing", "error semantics"],
};
