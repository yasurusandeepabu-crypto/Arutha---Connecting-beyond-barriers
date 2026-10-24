"""One local Whisper model, one inference at a time. No audio is written to disk."""

import io
import os
import threading
import time


class SpeechService:
    def __init__(self):
        self.model = None
        self.lock = threading.Lock()
        self.error = None

    def status(self):
        return {'ready': self.model is not None, 'busy': self.lock.locked(), 'error': self.error,
                'model': os.getenv('WHISPER_MODEL', 'base.en')}

    def load(self):
        if not self.lock.acquire(blocking=False):
            raise BlockingIOError('Speech service is busy; try again shortly.')
        try:
            if self.model is None:
                from faster_whisper import WhisperModel
                self.model = WhisperModel(os.getenv('WHISPER_MODEL', 'base.en'), device='cpu', compute_type='int8')
            self.error = None
        except Exception as error:
            self.error = str(error)
            raise
        finally:
            self.lock.release()
        return self.status()

    def transcribe(self, audio):
        if self.model is None:
            raise RuntimeError('Prepare the speech model first.')
        if not self.lock.acquire(blocking=False):
            raise BlockingIOError('Speech service is busy; this chunk was skipped.')
        started = time.perf_counter()
        try:
            segments, _ = self.model.transcribe(
                io.BytesIO(audio), language='en', beam_size=1, vad_filter=True,
                condition_on_previous_text=False,
                initial_prompt='Julie Anderson. South Africa. Pancakes and hot dogs.',
            )
            text = ' '.join(segment.text.strip() for segment in segments)
            return text, round((time.perf_counter() - started) * 1000, 1)
        finally:
            self.lock.release()


SPEECH = SpeechService()
