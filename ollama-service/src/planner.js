import { chatWithOllama } from './ollama-client.js';
import { buildSystemPrompt } from './personality-engine.js';

export async function buildPlan(message, state) {
  const systemPrompt = buildSystemPrompt(state.traits, state.lessons);

  // Filtramos el historial para asegurarnos de que la clave 'content' SIEMPRE sea texto, 
  // reparando cualquier error viejo que haya quedado guardado en tu state.json
  const safeHistory = (state.history || []).map(msg => ({
    role: msg.role,
    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
  }));

  const messages = [
    { role: 'system', content: String(systemPrompt) },
    ...safeHistory.slice(-10),
    { role: 'user', content: String(message) }
  ];

  try {
    const reply = await chatWithOllama(messages);
    
    return {
      response: reply
    };
  } catch (error) {
    console.error("Error en el cerebro de Chappy:", error);
    return {
      response: "Mmm, tuve un cortocircuito interno y no pude conectarme con Ollama."
    };
  }
}