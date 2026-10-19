require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { Server } = require('socket.io');

const planner = require('./src/planner');
const personalityEngine = require('./src/personality-engine');
const llmClient = require('./src/llm-client');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    assistant: 'Chappie (Jarvis Engine)',
    mode: personalityEngine.state.mode,
    stats: llmClient.getStats(),
    todayEvents: personalityEngine.getTodayEvents()
  });
});

app.post('/chat', async (req, res) => {
  try {
    const userText = req.body.message || req.body.text || req.body.prompt || '';
    if (!userText.trim()) {
      return res.status(400).json({ error: 'Falta el campo message o text.' });
    }

    io.emit('assistant:thinking', { text: userText });
    const response = await planner.processInput(userText);
    io.emit('assistant:speaking', response);

    return res.json(response);
  } catch (err) {
    console.error('[server] Error en /chat:', err.message);
    return res.status(500).json({
      error: err.message,
      reply: 'Tuve un inconveniente conectando con los proveedores en la nube. Revisá tu archivo .env.'
    });
  }
});

app.post('/study/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Subí un archivo PDF en el campo "pdf".' });
    }
    const parsed = await pdfParse(req.file.buffer);
    const studyMaterial = personalityEngine.loadStudyContent(req.file.originalname, parsed.text);
    return res.json({
      message: `PDF "${studyMaterial.title}" cargado en Modo Estudio (${studyMaterial.chunks.length} bloques).`,
      chunksCount: studyMaterial.chunks.length,
      mode: personalityEngine.state.mode
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

io.on('connection', (socket) => {
  console.log('[socket.io] Cliente conectado:', socket.id);
  socket.emit('assistant:state', {
    mode: personalityEngine.state.mode,
    stats: llmClient.getStats()
  });

  socket.on('user:message', async (payload) => {
    try {
      const text = typeof payload === 'string' ? payload : payload?.text || '';
      const result = await planner.processInput(text);
      socket.emit('assistant:reply', result);
    } catch (err) {
      socket.emit('assistant:error', { error: err.message });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🤖 Chappie Server (Groq + Fallback) activo en http://localhost:${PORT}`);
  console.log(`🧠 Modo actual: ${personalityEngine.state.mode}`);
  console.log(`=================================================`);
});
