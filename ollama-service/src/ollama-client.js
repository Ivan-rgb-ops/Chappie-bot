const OLLAMA_URL = 'http://localhost:11434/api/chat';
const DEFAULT_MODEL = 'llama3'; // Asegurate de tener este modelo descargado

export async function chatWithOllama(messages, model = DEFAULT_MODEL) {
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      model, 
      messages, 
      stream: false
      // Eliminamos el format: 'json' para que la IA pueda hablar con fluidez
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama respondió ${res.status}: ${text}`);
  }

  const data = await res.json();
  
  // Devolvemos directamente el texto puro, sin forzarlo a ser un objeto
  return data.message.content;
}