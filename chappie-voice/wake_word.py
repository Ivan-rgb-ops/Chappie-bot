import queue
import sys
import json
import sounddevice as sd
from vosk import Model, KaldiRecognizer
from thefuzz import fuzz # Importamos thefuzz para la similitud matemática

# Cola para almacenar el audio del micrófono en tiempo real
q = queue.Queue()

def callback(indata, frames, time, status):
    if status:
        print(status, file=sys.stderr)
    q.put(bytes(indata))

def listen_for_wake_word(model_path="vosk-model-small-es-0.42"):
    print("Cargando el oído inteligente de Chappy...")
    try:
        model = Model(model_path)
    except Exception as e:
        print(f"Error: No se encontró la carpeta del modelo en '{model_path}'.")
        print("Asegurate de que la carpeta del modelo esté en la misma carpeta que este script.")
        sys.exit(1)
        
    recognizer = KaldiRecognizer(model, 16000)

    print("\n🎙️ Chappy está durmiendo... (Decí 'Chappy' para despertarlo)")

    # Configuramos el radar inteligente
    TARGET_WORD = "chapi"
    MIN_SIMILARITY = 70 # Porcentaje mínimo de coincidencia aceptado

    with sd.RawInputStream(samplerate=16000, blocksize=8000, device=None, dtype='int16',
                           channels=1, callback=callback):
        while True:
            data = q.get()
            if recognizer.AcceptWaveform(data):
                result = json.loads(recognizer.Result())
                text = result.get("text", "").lower()
                
                if text:
                    print(f"👂 Escuchado: '{text}'")
                    
                    # Rompemos la oración en palabras y evaluamos cada una
                    for word in text.split():
                        score = fuzz.ratio(word, TARGET_WORD)
                        
                        # MOSTRAMOS EL PUNTAJE DE TODO PARA CALIBRAR:
                        print(f"   -> Evaluando '{word}' contra '{TARGET_WORD}': {score}%")
                        
                        # Si alguna palabra alcanza o supera el 75% de similitud, activamos
                        if score >= MIN_SIMILARITY:
                            print(f"\n✨ [WAKE WORD DETECTADO] '{word}' coincide en un {score}% con '{TARGET_WORD}'. ¡Despertando!")
                            return True

# Bloque de prueba directa
if __name__ == "__main__":
    listen_for_wake_word()