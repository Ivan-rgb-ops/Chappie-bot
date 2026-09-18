import json
import requests

INTENT_URL = "http://localhost:3001/api/intent"


def detect_intent(message: str):

    try:

        response = requests.post(
            INTENT_URL,
            json={
                "message": message
            },
            timeout=30
        )

        if not response.ok:
            return {
                "intent": "chat"
            }

        data = response.json()

        print("Respuesta del servidor:", data)

        # El server devuelve:
        # { "reply": "{\"intent\":\"open_app\", ...}" }

        if "reply" in data:

            try:
                return json.loads(data["reply"])
            except Exception:
                print("No pude interpretar el JSON:", data["reply"])
                return {
                    "intent": "chat"
                }

        return data

    except Exception as e:

        print("Error detectando intención:", e)

        return {
            "intent": "chat"
        }