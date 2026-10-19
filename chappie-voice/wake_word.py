import os
import json
import queue
import sounddevice as sd
from vosk import Model, KaldiRecognizer

WAKE_WORDS = ("chappie", "chapi", "jarvis", "hola chappie", "che chappie")

class WakeWordDetector:
    def __init__(self, model_dir="vosk-model-small-es-0.42", sample_rate=16000):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        full_model_path = os.path.join(base_dir, model_dir)
        if not os.path.exists(full_model_path):
            raise FileNotFoundError(
                f"No se encontró el modelo Vosk en: {full_model_path}. "
                "Asegurate de copiar la carpeta vosk-model-small-es-0.42 dentro de chappie-voice/."
            )
        self.sample_rate = sample_rate
        os.chdir(base_dir)
        self.model = Model(model_dir)
        self.audio_queue = queue.Queue()

    def _audio_callback(self, indata, frames, time, status):
        if status:
            print(f"[Audio Status] {status}")
        self.audio_queue.put(bytes(indata))

    def listen_for_wake_word(self):
        recognizer = KaldiRecognizer(self.model, self.sample_rate)
        print("🎙️ Esperando palabra de activación ('Chappie' o 'Jarvis')...")
        with sd.RawInputStream(
            samplerate=self.sample_rate,
            blocksize=8000,
            dtype="int16",
            channels=1,
            callback=self._audio_callback,
        ):
            while True:
                data = self.audio_queue.get()
                if recognizer.AcceptWaveform(data):
                    res = json.loads(recognizer.Result())
                    text = res.get("text", "").lower().strip()
                else:
                    res = json.loads(recognizer.PartialResult())
                    text = res.get("partial", "").lower().strip()

                if any(w in text for w in WAKE_WORDS):
                    print("⚡ ¡Wake word detectada!")
                    return True

    def listen_command(self, timeout_seconds=10):
        recognizer = KaldiRecognizer(self.model, self.sample_rate)
        print("👂 Te escucho...")
        with sd.RawInputStream(
            samplerate=self.sample_rate,
            blocksize=8000,
            dtype="int16",
            channels=1,
            callback=self._audio_callback,
        ):
            max_Iterations = int((self.sample_rate / 8000) * timeout_seconds * 2)
            for _ in range(max_Iterations):
                data = self.audio_queue.get()
                if recognizer.AcceptWaveform(data):
                    res = json.loads(recognizer.Result())
                    text = res.get("text", "").strip()
                    if text:
                        return text
            final_res = json.loads(recognizer.FinalResult())
            return final_res.get("text", "").strip()
