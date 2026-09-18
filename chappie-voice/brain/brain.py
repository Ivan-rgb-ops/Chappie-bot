from brain.llm import ask_brain
from skills.executor import execute


class Brain:

    def process(self, message: str):

        result = ask_brain(message)

        if "response" not in result:
            result["response"] = ""

        if "actions" not in result:
            result["actions"] = []

        # Ejecutar las acciones que envía el cerebro
        execute(result["actions"])

        return result