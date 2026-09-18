import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

try {
  process.loadEnvFile('.env');
} catch (err) {
  console.warn('No se pudo cargar .env automáticamente:', err.message);
}

import { chatWithOllama } from './src/ollama-client.js';
import { buildSystemPrompt, nudgeTrait, TRAIT_NAMES } from './src/personality-engine.js';
import { loadState, saveState } from './src/memory-store.js';
import { buildPlan } from './src/planner.js';

const HISTORY_WINDOW = 10;
const PORT = process.env.PORT || 3001;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());
app.use(express.static('public'));

// ---------------------------------------------------------------------------
// WEBSOCKETS: Conexión con el Frontend (Orbe Animado)
// ---------------------------------------------------------------------------
io.on('connection', (socket) => {
    console.log('✨ Interfaz Visual del Orbe conectada.');
    socket.emit('bot_escuchando');
});

// ---------------------------------------------------------------------------
// ENDPOINTS ORIGINALES
// ---------------------------------------------------------------------------

app.get('/api/estado', (_req, res) => {
  const state = loadState();
  res.json({
    traits: state.traits,
    lessons: state.lessons,
    history: state.history,
    traitNames: TRAIT_NAMES,
  });
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Falta el mensaje' });
  }

  const state = loadState();
  const systemPrompt = buildSystemPrompt(state.traits, state.lessons);
  const messages = [
    { role: 'system', content: systemPrompt },
    ...state.history.slice(-HISTORY_WINDOW),
    { role: 'user', content: message },
  ];

  try {
    const reply = await chatWithOllama(messages);
    state.history.push({ role: 'user', content: message });
    state.history.push({ role: 'assistant', content: reply });
    saveState(state);
    res.json({ reply, traits: state.traits, lessons: state.lessons });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/intent', async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: 'Falta el mensaje' });

  const prompt = `
Sos un clasificador de intenciones.
Respondé ÚNICAMENTE un JSON válido.
No escribas explicaciones.
Las intenciones posibles son:
- open_app
- open_site
- teach
- chat

Mensaje:
${message}
`;

  try {
    const reply = await chatWithOllama([{ role: "system", content: prompt }, { role: "user", content: message }]);
    let intent;
    try {
        intent = JSON.parse(reply);
    } catch {
        intent = { intent: "chat", target: null, query: null, lesson: null, confidence: 0 };
    }
    intent = {
        intent: intent.intent ?? "chat",
        target: intent.target ?? null,
        query: intent.query ?? null,
        lesson: intent.lesson ?? null,
        confidence: intent.confidence ?? 1
    };
    res.json(intent);
} catch (err) {
    res.status(500).json({ error: err.message });
}
});

app.post('/api/brain', async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: "Falta el mensaje" });

  console.log(`vos> ${message}`);

  // 1. Dibuja tu mensaje en el chat
  io.emit('mensaje_usuario', { text: message });
  
  // 2. Pone el orbe amarillo y muestra "Pensando..."
  io.emit('procesando_llama');

  try {
    const state = loadState();
    const result = await buildPlan(message, state);

    // ESTA LÍNEA ES LA CLAVE PARA VER QUÉ ESTÁ PASANDO:
    console.log("🔍 LO QUE DEVUELVE PLANNER:", result);

    // Extraemos la respuesta de forma segura y agregamos un salvavidas por si viene vacío
    const responseText = result?.response || result?.reply || (typeof result === 'string' ? result : JSON.stringify(result)) || "No sé qué decirte, mi cerebro falló.";

    state.history.push({ role: "user", content: message });
    state.history.push({ role: "assistant", content: responseText });
    saveState(state);

    console.log(`chappy> ${responseText}`);

    // 3. Pone el orbe verde y dibuja la respuesta de la IA en el chat
    io.emit('mensaje_bot', { text: responseText });

    res.json({ response: responseText });
  } catch (err) {
    console.error(err);
    io.emit('mensaje_bot', { text: "Uf, me dio un error de conexión interno." });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ensenar', (req, res) => {
  const { lesson } = req.body;
  if (!lesson || !lesson.trim()) return res.status(400).json({ error: 'Falta la lección' });
  const state = loadState();
  state.lessons.push(lesson.trim());
  saveState(state);
  res.json({ lessons: state.lessons });
});

app.post('/api/rasgo', (req, res) => {
  const { trait, delta } = req.body;
  if (!TRAIT_NAMES.includes(trait)) return res.status(400).json({ error: `Rasgos válidos: ${TRAIT_NAMES.join(', ')}` });
  const state = loadState();
  state.traits = nudgeTrait(state.traits, trait, delta > 0 ? 10 : -10);
  saveState(state);
  res.json({ traits: state.traits });
});

server.listen(PORT, () => {
  console.log(`✅ Servidor + Socket.io corriendo en http://localhost:${PORT}`);
});