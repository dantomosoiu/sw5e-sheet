"""Dev server for the SW5E sheet viewer.

Serves the repo root on http://127.0.0.1:8765 and:
  * /                       -> redirects to the viewer
  * /sw5e-sheet/viewer.html -> the real viewer page with dev/chrome-shim.js injected
                               before the first <script> and dev/bridge-proxy.js after
                               bridge.js (the extension files are untouched)
  * /dev/fixtures/index.json -> list of fixture snapshot files (generated)
  * /dev/capture.js          -> paste-into-sw5e.com script built from bridge.js's
                               sw5ePageExtract; downloads sheet snapshots as fixtures
  * POST /dev/dump/<name>    -> saves the request body to dev/dumps/<name> (git-ignored),
                               for pulling data out of the dev page for analysis

Everything is served with no-store so a plain reload picks up edits.
Usage: python dev/serve.py [port]
"""
import http.server
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
EXT = ROOT / 'sw5e-sheet'
DEV = ROOT / 'dev'
FIXTURES = DEV / 'fixtures'
DUMPS = DEV / 'dumps'
SHIM_TAG = '<script src="/dev/chrome-shim.js"></script>\n  '
BRIDGE_TAG = '<script src="bridge.js"></script>'
PROXY_TAG = '\n  <script src="/dev/bridge-proxy.js"></script>'


def build_capture_js():
    src = (EXT / 'bridge.js').read_text(encoding='utf-8')
    m = re.search(r'async function sw5ePageExtract\(\w+\) \{.*?\n\}\n', src, re.S)
    if not m:
        raise RuntimeError('sw5ePageExtract not found in bridge.js')
    wrapper = (DEV / 'capture-wrapper.js').read_text(encoding='utf-8')
    return '// Generated from sw5e-sheet/bridge.js by dev/serve.py\n' + m.group(0) + '\n' + wrapper


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def send_text(self, body, ctype):
        data = body.encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', ctype + '; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        path = self.path.partition('?')[0]
        m = re.fullmatch(r'/dev/dump/([\w.-]+)', path)
        if not m:
            self.send_error(404)
            return
        body = self.rfile.read(int(self.headers.get('Content-Length') or 0))
        DUMPS.mkdir(exist_ok=True)
        (DUMPS / m.group(1)).write_bytes(body)
        self.send_text(json.dumps({'saved': m.group(1), 'bytes': len(body)}), 'application/json')

    def do_GET(self):
        path, _, query = self.path.partition('?')
        if path == '/':
            self.send_response(302)
            self.send_header('Location', '/sw5e-sheet/viewer.html' + ('?' + query if query else ''))
            self.end_headers()
            return
        if path == '/sw5e-sheet/viewer.html':
            html = (EXT / 'viewer.html').read_text(encoding='utf-8')
            i = html.find('<script')
            html = html[:i] + SHIM_TAG + html[i:] if i >= 0 else html
            html = html.replace(BRIDGE_TAG, BRIDGE_TAG + PROXY_TAG)
            return self.send_text(html, 'text/html')
        if path == '/dev/fixtures/index.json':
            files = sorted(p.name for p in FIXTURES.glob('*.json')) if FIXTURES.exists() else []
            return self.send_text(json.dumps(files), 'application/json')
        if path == '/dev/capture.js':
            return self.send_text(build_capture_js(), 'text/javascript')
        return super().do_GET()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    print(f'SW5E sheet dev server: http://127.0.0.1:{port}/')
    http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
