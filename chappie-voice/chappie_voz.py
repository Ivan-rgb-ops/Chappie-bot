import os
import requests
import pyttsx3
from dotenv import load_dotenv
from wake_word import WakeWordDetector

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "ollama-service", ".env"))

SERVER_URL = os.getenv("CHAPPIE_SERVER_URL", "http://localhost:3000/chat")

def init_tts():
    engine = pyttsx3.init()
    engine.setProperty("rate", 185)
    voices = engine.getProperty("voices")
    for v in voices:
        if "spanish" in v.name.lower() or "es-" in v.id.lower() or "helena" in v.name.lower() or "sabina" in v.name.lower():
            engine.setProperty("voice", v.id)
            break
    return engine

def speak(engine, text):
    print(f"🤖 Chappie: {text}")
    engine.say(text)
    engine.runAndWait()

def send_to_brain(text):
    try:
        resp = requests.post(SERVER_URL, json={"message": text}, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        return data.get("reply", "No recibí respuesta del servidor.")
    except Exception as e:
        return f"No pude conectarme con el servidor de Chappie: {e}"

def main():
    tts = init_tts()
    try:
        detector = WakeWordDetector()
    except FileNotFoundError:
        print("💡 Modo consola directa activo (escribí tu mensaje):")
        while True:
            user_input = input("Vos: ").strip()
            if not user_input or user_input.lower() in ("salir", "exit"):
                break
            reply = send_to_brain(user_input)
            speak(tts, reply)
        return

    speak(tts, "Sistemas en línea. Te escucho directamente.")
    while True:
        try:
            command = detector.listen_command(timeout_seconds=15)
            if not command:
                continue
            print(f"🗣️ Dijiste: {command}")
            if command.lower() in ("salir", "exit", "chau"):
                speak(tts, "Hasta luego, Iván.")
                break
            reply = send_to_brain(command)
            speak(tts, reply)
        except KeyboardInterrupt:
            print("\n👋 Cerrando Chappie Voz.")
            break

if __name__ == "__main__":
    main()