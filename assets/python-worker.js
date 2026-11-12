/* The documented checkout runs unchanged in a dedicated, cancellable worker. */
const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.29.3/full/";
let runtime;
let loading;
let currentId;
const status = (message) => self.postMessage({ id: currentId, type: "status", message });

async function initialize() {
  status("Loading Python (first run may take a minute)…");
  importScripts(`${PYODIDE_URL}pyodide.js`);
  runtime = await loadPyodide({ indexURL: PYODIDE_URL });
  status("Loading NumPy, SciPy, Matplotlib, and NetworkX…");
  await runtime.loadPackage(["numpy", "scipy", "matplotlib", "networkx", "micropip"]);
  status("Loading palettes and the documented matmalib source…");
  await runtime.runPythonAsync(`
import micropip
await micropip.install(["colormaps==0.4.2", "py3Dmol==2.5.3"], deps=False)
`);
  const response = await fetch(new URL("matmalib-runtime.zip", self.location.href));
  if (!response.ok) throw new Error(`Could not load bundled examples (HTTP ${response.status}).`);
  runtime.unpackArchive(await response.arrayBuffer(), "zip", { extractDir: "/home/pyodide" });
  runtime.runPython(`
import os, sys
os.chdir("/home/pyodide")
if "/home/pyodide" not in sys.path:
    sys.path.insert(0, "/home/pyodide")
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matmalib
`);
}

const EXECUTE = `
import ast as _ast, base64 as _base64, contextlib as _contextlib
import io as _io, json as _json, os as _os, traceback as _traceback
from pathlib import Path as _Path
import matplotlib as _mpl
import matplotlib.pyplot as _plt

_os.chdir("/home/pyodide")
_plt.close("all")
_mpl.rcdefaults()
_stdout, _stderr = _io.StringIO(), _io.StringIO()
_namespace = {"__name__": "__main__"}
_error = None
_before = {str(p): (p.stat().st_mtime_ns, p.stat().st_size) for p in _Path('.').rglob('*') if p.is_file()}
with _contextlib.redirect_stdout(_stdout), _contextlib.redirect_stderr(_stderr):
    try:
        _tree = _ast.parse(_example_code, "<example>")
        if _tree.body and isinstance(_tree.body[-1], _ast.Expr):
            _last = _tree.body.pop()
            exec(compile(_tree, "<example>", "exec"), _namespace)
            _value = eval(compile(_ast.Expression(_last.value), "<example>", "eval"), _namespace)
            if _value is not None:
                print(repr(_value))
        else:
            exec(compile(_tree, "<example>", "exec"), _namespace)
    except BaseException:
        _error = _traceback.format_exc()
_figures = []
for _number in _plt.get_fignums()[:12]:
    _buffer = _io.BytesIO()
    _plt.figure(_number).savefig(_buffer, format="png", dpi=110, bbox_inches="tight")
    _figures.append(_base64.b64encode(_buffer.getvalue()).decode())
_plt.close("all")
_files = []
_total_bytes = 0
for _p in sorted(_Path('/home/pyodide').rglob('*')):
    if not _p.is_file() or any(part in ('matmalib', 'data', '__pycache__', '.cache') for part in _p.relative_to('/home/pyodide').parts):
        continue
    _relative = str(_p.relative_to('/home/pyodide'))
    _stat = _p.stat()
    if _before.get(_relative) == (_stat.st_mtime_ns, _stat.st_size):
        continue
    if _stat.st_size > 5_000_000 or _total_bytes + _stat.st_size > 15_000_000:
        continue
    _total_bytes += _stat.st_size
    _files.append({"name": _relative, "data": _base64.b64encode(_p.read_bytes()).decode()})
_json.dumps({"stdout": _stdout.getvalue()[:100000], "stderr": _stderr.getvalue()[:100000], "error": _error, "figures": _figures, "files": _files})
`;

self.onmessage = async ({ data }) => {
  currentId = data.id;
  try {
    loading ||= initialize();
    await loading;
    status("Running Python…");
    runtime.globals.set("_example_code", data.code);
    const result = JSON.parse(await runtime.runPythonAsync(EXECUTE));
    self.postMessage({ id: data.id, type: "result", ...result });
  } catch (error) {
    self.postMessage({ id: data.id, type: "fatal", error: String(error) });
  }
};
