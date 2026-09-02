#!/usr/bin/env python3
"""Un petit serveur pour ESSAYER l'extension, qui interdit le cache.

Sans ça on travaille à l'aveugle : le navigateur ressert l'ancien onglet.js ou
l'ancien onglet.html, on regarde une correction qui n'est pas là, et on croit
que le code est faux. Ça m'est arrivé deux fois de suite.

    python3 outils/servir.py [port]
"""
import http.server, os, sys

DOSSIER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "ext")

class SansCache(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=os.path.abspath(DOSSIER), **k)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, *a):
        pass

port = int(sys.argv[1]) if len(sys.argv) > 1 else 4188
print(f"extension servie sur http://127.0.0.1:{port}/onglet.html (sans cache)")
http.server.ThreadingHTTPServer(("127.0.0.1", port), SansCache).serve_forever()
