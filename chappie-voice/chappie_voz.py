"""
chappie_voz.py — asistente de voz local para chappie-bot.
"""
from brain.brain import Brain
import os
import re
import sys
import unicodedata
import webbrowser
import requests
import speech_recognition as sr

try:
    import pyttsx3
except ImportError:
    pyttsx3 = None

# IMPORTAMOS TU NUEVO RADAR DE VOZ OFFLINE
from wake_word import listen_for_wake_word

# ---------------------------------------------------------------------------
# Configuración
# ---------------------------------------------------------------------------

BACKEND_URL = "http://localhost:3001/api/chat"
INTENT_URL = "http://localhost:3001/api/intent"

IDLE_TIMEOUT = 10          # segundos que espera un sonido antes de reintentar
PHRASE_TIME_LIMIT = 20     # duración máxima de una frase capturada

EXIT_WORDS = ["chau chappie", "apagate", "salir chappie", "hasta luego chappie"]

# ---------------------------------------------------------------------------
# Voz: texto -> audio
# ---------------------------------------------------------------------------

_tts_engine = pyttsx3.init()
_tts_engine.setProperty("rate", 175)

for voice in _tts_engine.getProperty("voices"):
    if "spanish" in voice.name.lower() or "español" in voice.name.lower() or "es-" in voice.id.lower():
        _tts_engine.setProperty("voice", voice.id)
        break

def speak(text: str):
    print(f"chappie> {text}")
    _tts_engine.say(text)
    _tts_engine.runAndWait()

# ---------------------------------------------------------------------------
# Oído: audio -> texto (Comandos largos)
# ---------------------------------------------------------------------------

_recognizer = sr.Recognizer()
_recognizer.dynamic_energy_threshold = True
_recognizer.pause_threshold = 1.5
_recognizer.phrase_threshold = 0.3
_recognizer.non_speaking_duration = 0.5

_microphone = sr.Microphone()

with _microphone as source:
    print("Calibrando micrófono para el ruido ambiente (un segundo)...")
    _recognizer.adjust_for_ambient_noise(source, duration=1)

def listen_once():
    """Escucha una frase y la devuelve como texto, o None si no entendió nada."""
    with _microphone as source:
        try:
            audio = _recognizer.listen(source, timeout=IDLE_TIMEOUT, phrase_time_limit=PHRASE_TIME_LIMIT)
        except sr.WaitTimeoutError:
            return None

    try:
        return _recognizer.recognize_google(audio, language="es-AR")
    except sr.UnknownValueError:
        return None
    except sr.RequestError as e:
        print(f"(error de conexión al reconocer voz: {e})")
        return None

def strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    return "".join(c for c in normalized if unicodedata.category(c) != "Mn")

# ---------------------------------------------------------------------------
# Loop principal AUTÓNOMO
# ---------------------------------------------------------------------------

def main():
    speak("Chappie iniciado. Decí mi nombre para despertarme.")

    while True:
        # 1. El radar offline se queda escuchando sin frenar la PC
        despierto = listen_for_wake_word()

        if despierto:
            # 2. Nos confirma que nos escuchó
            speak("¿Qué necesitas?")
            
            # 3. Escucha el comando real usando Google (que es mejor para frases largas)
            print("🎤 Escuchando tu comando...")
            command = listen_once()

            if not command:
                print("No se entendió el comando o hubo silencio. Volviendo a dormir...")
                continue

            print(f"vos> {command}")

            # Revisamos si el comando fue para apagar el bot
            norm_command = strip_accents(command.lower())
            if any(exit_phrase.replace("chappie", "").strip() in norm_command for exit_phrase in EXIT_WORDS):
                speak("Chau, me voy a dormir. Apagando sistema.")
                break

            # 4. Le mandamos el comando a Node.js (Esto mueve el Orbe y procesa la IA)
            try:
                res = requests.post("http://localhost:3001/api/brain", json={"message": command})
                if res.ok:
                    data = res.json()
                    response = data.get("response", "")
                    if response:
                        speak(response)
                else:
                    speak("El servidor devolvió un error.")
            except requests.exceptions.ConnectionError:
                speak("No me puedo comunicar con el Orbe. ¿Está prendido el servidor de Node?")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nCortado por el usuario.")
        sys.exit(0)