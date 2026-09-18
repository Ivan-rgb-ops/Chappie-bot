# 🤖 Chappie AI Suite

Ecosistema modular de Inteligencia Artificial local que integra control por voz offline, orquestación de intenciones y comunicación en tiempo real con modelos de lenguaje.

---

## 📂 Estructura del Repositorio

```text
chappie-ai-suite/
├── chappie-voice/       # Asistente de voz local autónomo en Python
├── ollama-service/      # Servidor Node.js + WebSockets con streaming de LLMs locales
├── .gitignore           # Filtro de dependencias y modelos pesados
└── README.md            # Documentación general de la suite
```

---

## 🚀 Proyectos Incluidos

### 1. [Chappie Voice](./chappie-voice) (Python)
Asistente de voz local diseñado para operar con baja latencia y sin dependencia exclusiva de la nube:
* **Reconocimiento de voz offline:** Procesamiento por micrófono mediante Vosk (`chappie_voz.py`).
* **Enrutador de intenciones (`intent.py`):** Diferenciación inmediata entre comandos de sistema e inferencias complejas.
* **Cerebro LLM (`brain/`):** Gestión de prompts contextuales e integración con modelos Llama vía Ollama.
* **Capa de ejecución (`skills/` y `actions.py`):** Acciones automatizadas del sistema operativo desacopladas del modelo.

> *Nota: Descarga el modelo de voz en español desde [alphacephei.com/vosk/models](https://alphacephei.com/vosk/models) (ej. `vosk-model-small-es-0.42`) y colócalo dentro de `chappie-voice/`.*

---

### 2. [Ollama Service](./ollama-service) (Node.js & WebSockets)
Backend en tiempo real orientado a eventos para interactuar con modelos locales de IA:
* **Streaming en tiempo real (`server.js`):** Comunicación bidireccional cliente-servidor mediante Express y Socket.io.
* **Integración con Ollama (`src/ollama-client.js`):** Emisión continua de tokens conforme el modelo genera la respuesta.
* **Planificación y Personalidad (`src/planner.js`, `src/personality-engine.js`):** Desacoplamiento de las reglas de comportamiento y razonamiento en pasos.
* **Memoria de estado (`src/memory-store.js`):** Retención y persistencia de contexto entre sesiones.
