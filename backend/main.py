"""Local audio capture, translation and playback demo server."""

import json
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from .asl import WORDS, interpret, translate
from .stt import SPEECH

ROOT = Path(__file__).resolve().parents[1] / "avatar"
FRONTEND = ROOT.parent / 'frontend' / 'out'
ORIGINS = {o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")}


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        origin = self.headers.get("Origin")
        if origin in ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Session-Id, X-Chunk-Sequence, X-Chunk-Gap, X-Preview-Unverified")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        super().end_headers()

    def reply(self, status, body):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.reply(200, {})

    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/' and (FRONTEND / 'index.html').is_file():
            self.directory = str(FRONTEND)
            self.path = '/index.html'
            return super().do_GET()
        if path.startswith(('/_next/', '/images/', '/runtime/', '/licenses/')) and FRONTEND.is_dir():
            self.directory = str(FRONTEND)
            return super().do_GET()
        if self.path == '/':
            self.send_response(302)
            self.send_header('Location', '/live.html')
            self.end_headers()
            return
        if urlparse(self.path).path == "/api/signs":
            self.reply(200, {"language": "ASL", "signs": sorted(WORDS), "max_tokens": 25, "mode": "unverified lexical preview"})
        elif self.path == '/api/health':
            self.reply(200, {'speech': SPEECH.status(), 'translation': {'analyzer': 'asl-lexical-preview', 'language': 'ASL', 'deaf_native_reviewed': False}})
        elif self.path == '/api/phrases':
            return self.reply(200, {'language': 'ASL', 'phrases': [{'id': word, 'meaning': word, 'configured': True, 'validation_status': 'UNVERIFIED', 'validated': False} for word in sorted(WORDS)]})
        elif self.path == '/api/catalog':
            self.reply(200, {'language': 'ASL', 'mode': 'lexical_preview', 'deaf_native_reviewed': False,
                             'signs': sorted(WORDS), 'sentence_grammar_generated': False})
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/prepare':
            try:
                self.reply(200, SPEECH.load())
            except BlockingIOError as error:
                self.reply(429, {'error': str(error)})
            except Exception as error:
                self.reply(503, {'error': f'Cannot load local speech model: {error}'})
            return
        if self.path == '/api/audio':
            return self.audio()
        if self.path == '/api/interpret':
            try:
                size = int(self.headers.get('Content-Length', '0'))
                if not 0 < size <= 16384:
                    return self.reply(413, {'error': 'request too large or empty'})
                body = json.loads(self.rfile.read(size))
                if not isinstance(body, dict) or not isinstance(body.get('text'), str) or len(body['text']) > 2000:
                    raise ValueError('text must be a string, maximum 2000 characters')
                sequence = body.get('sequence', 0)
                if not isinstance(sequence, int) or sequence < 0:
                    raise ValueError('invalid sequence')
                self.reply(200, interpret(body['text'], body['session_id'], sequence, bool(body.get('flush')), bool(body.get('gap')), body.get('preview_unverified') is True))
            except (ValueError, KeyError, UnicodeError) as error:
                self.reply(400, {'error': str(error)})
            return
        if self.path not in ('/api/gloss', '/api/translate'):
            return self.reply(404, {"error": "not found"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 16_384:
                return self.reply(413, {"error": "request too large or empty"})
            body = json.loads(self.rfile.read(size))
            text = body.get("text") if isinstance(body, dict) else None
            if not isinstance(text, str) or not text.strip() or len(text) > 2000:
                return self.reply(400, {"error": "text must contain 1–2000 characters"})
            self.reply(200, translate(text.strip(), preview=body.get('preview_unverified') is True))
        except (ValueError, UnicodeError):
            self.reply(400, {"error": "invalid JSON request"})

    def audio(self):
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 4_000_000:
                return self.reply(413, {'error': 'audio chunk must be 1 byte–4 MB'})
            session_id = self.headers.get('X-Session-Id', '')
            sequence = int(self.headers.get('X-Chunk-Sequence', '-1'))
            if sequence < 0:
                raise ValueError('invalid chunk sequence')
            audio = self.rfile.read(size)
            text, elapsed = SPEECH.transcribe(audio)
            result = interpret(text, session_id, sequence, flush=not text.strip(), gap=self.headers.get('X-Chunk-Gap') == '1', preview=self.headers.get('X-Preview-Unverified') == '1')
            result['stt_ms'] = elapsed
            self.reply(200, result)
        except BlockingIOError as error:
            self.reply(429, {'error': str(error)})
        except RuntimeError as error:
            self.reply(503, {'error': str(error)})
        except Exception as error:
            self.reply(400, {'error': f'Audio processing failed: {error}'})


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    print(f"SignBridge: http://localhost:{port}", flush=True)
    ThreadingHTTPServer((os.getenv("HOST", "127.0.0.1"), port), partial(Handler, directory=str(ROOT))).serve_forever()
