"""Simple HTTP server for testing the knowledge graph frontend.
Run from the project root: python scripts/serve.py
Then open http://localhost:8000/frontend/knowledge_graph_v2.html
"""
import http.server
import os

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
print(f"Serving from: {os.getcwd()}")
print(f"Open: http://localhost:8000/frontend/index.html")

handler = http.server.SimpleHTTPRequestHandler
handler.extensions_map.update({'.json': 'application/json'})
server = http.server.HTTPServer(('localhost', 8000), handler)
server.serve_forever()
