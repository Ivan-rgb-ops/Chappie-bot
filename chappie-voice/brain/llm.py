import requests

BRAIN_URL = "http://localhost:3001/api/brain"


def ask_brain(message: str):
    try:
        response = requests.post(
            BRAIN_URL,
            json={"message": message},
            timeout=180,
        )

        response.raise_for_status()

        return response.json()

    except Exception as e:
        print("Error hablando con el cerebro:", e)

        return {
            "response": "No pude conectarme con mi cerebro.",
            "actions": [],
        }


        