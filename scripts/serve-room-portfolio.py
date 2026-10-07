#!/usr/bin/env python3
"""Loopback-only preview of the portfolio production build, including SPA routes."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse

class PreviewServer(ThreadingHTTPServer):
    # Browsers request the module graph and lazy project thumbnails in bursts.
    request_queue_size = 64

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.mjs': 'text/javascript', '.glb': 'model/gltf-binary'}
    def do_GET(self):
        path = Path(self.translate_path(self.path.split('?')[0]))
        if not path.exists() and not path.suffix:
            self.path = '/index.html'
        super().do_GET()
    def log_message(self, *_args):
        pass

if __name__ == '__main__':
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument('--port', type=int, default=4175)
    options = args.parse_args()
    directory = Path(__file__).resolve().parents[1] / 'portfolio' / 'build'
    if not (directory / 'index.html').exists():
        raise SystemExit('Build first: cd portfolio && npm run build')
    server = PreviewServer(('127.0.0.1', options.port), partial(Handler, directory=str(directory)))
    print(f'Local portfolio preview: http://127.0.0.1:{options.port}/room', flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: server.server_close()
