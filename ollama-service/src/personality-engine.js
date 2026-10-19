const fs = require('fs');
const path = require('path');

const STATE_PATH = path.join(__dirname, '..', 'data', 'state.json');

const DEFAULT_STATE = {
  assistantName: 'Chappie',
  mode: 'jarvis', // 'jarvis' | 'study' | 'oral_exam'
  traits: {
    wit: 0.8,
    conciseness: 0.9,
    empathy: 0.85
  },
  rollingSummary: 'Inicio de memoria del asistente.',
  facts: [],
  events: [],
  studyMaterial: {
    title: '',
    chunks: [],
    currentChunkIndex: 0
  },
  recentHistory: []
};

class PersonalityEngine {
  constructor() {
    this.state = this.loadState();
  }

  loadState() {
    try {
      const dir = path.dirname(STATE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(STATE_PATH)) {
        const raw = fs.readFileSync(STATE_PATH, 'utf-8');
        return { ...DEFAULT_STATE, ...JSON.parse(raw) };
      }
    } catch (err) {
      console.warn('[personality-engine] No se pudo leer state.json, usando base por defecto:', err.message);
    }
    return structuredClone(DEFAULT_STATE);
  }

  saveState() {
    try {
      const dir = path.dirname(STATE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(STATE_PATH, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error('[personality-engine] Error guardando state.json:', err.message);
    }
  }

  setMode(mode) {
    if (['jarvis', 'study', 'oral_exam'].includes(mode)) {
      this.state.mode = mode;
      this.saveState();
    }
    return this.state.mode;
  }

  addEvent(description, dateStr) {
    const newEvent = {
      id: Date.now(),
      description,
      date: dateStr || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString()
    };
    this.state.events.push(newEvent);
    this.saveState();
    return newEvent;
  }

  getTodayEvents() {
    const today = new Date().toISOString().slice(0, 10);
    return (this.state.events || []).filter((e) => e.date === today || e.description.toLowerCase().includes('hoy'));
  }

  addFact(fact) {
    if (fact && !this.state.facts.includes(fact)) {
      this.state.facts.push(fact);
      if (this.state.facts.length > 50) {
        this.state.facts.shift();
      }
      this.saveState();
    }
  }

  loadStudyContent(title, text) {
    const paragraphs = text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 40);

    const chunks = [];
    let current = '';
    for (const p of paragraphs) {
      if ((current + '\n' + p).length > 1500) {
        chunks.push(current);
        current = p;
      } else {
        current = current ? `${current}\n${p}` : p;
      }
    }
    if (current) chunks.push(current);

    this.state.studyMaterial = {
      title: title || 'Apunte de estudio',
      chunks: chunks.length ? chunks : [text.slice(0, 1500)],
      currentChunkIndex: 0
    };
    this.state.mode = 'study';
    this.saveState();
    return this.state.studyMaterial;
  }

  buildSystemPrompt() {
    const today = new Date().toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const todayEvents = this.getTodayEvents();
    const eventsText =
      todayEvents.length > 0
        ? todayEvents.map((e) => `- ${e.description} (${e.date})`).join('\n')
        : 'Sin eventos agendados para hoy.';

    const factsText =
      this.state.facts && this.state.facts.length > 0
        ? this.state.facts.slice(-15).map((f) => `- ${f}`).join('\n')
        : 'Sin hechos adicionales registrados.';

    let modeInstructions = `
MODO ACTUAL: ASISTENTE JARVIS (Ping-Pong Fluido).
- Hablá en español rioplatense natural (vos), con el estilo ágil, leal y con un toque de ironía inteligente estilo Jarvis.
- Sé conciso para voz: respondé en 1 a 3 oraciones y fomentá el ida y vuelta con una repregunta corta o comentario útil.
`;

    if (this.state.mode === 'study') {
      const currentChunk =
        this.state.studyMaterial?.chunks?.[this.state.studyMaterial.currentChunkIndex] ||
        'Todavía no se cargó ningún PDF o texto de estudio.';
      modeInstructions = `
MODO ACTUAL: PROFESOR DE ESTUDIO (${this.state.studyMaterial?.title || 'General'}).
- Explicá los conceptos de forma clara y didáctica.
- Si el usuario se equivoca, corregilo con buena onda, explicá el porqué y tirale una pista o mini ayuda sin regalarle toda la respuesta de una.
- Material de referencia actual:
---
${currentChunk}
---
`;
    } else if (this.state.mode === 'oral_exam') {
      const currentChunk =
        this.state.studyMaterial?.chunks?.[this.state.studyMaterial.currentChunkIndex] ||
        'Evaluación general de conocimientos.';
      modeInstructions = `
MODO ACTUAL: MESA DE EXAMEN ORAL.
- Actuá como un profesor tomando examen oral por voz.
- Hacé UNA pregunta concreta por turno sobre el material, escuchá la explicación del usuario, dale feedback preciso (qué estuvo bien y qué faltó) y si se traba dale una pista socrática antes de pasar a la siguiente pregunta.
- Material evaluado:
---
${currentChunk}
---
`;
    }

    return `Sos Chappie (con arquitectura tipo Jarvis), el asistente personal de Iván.
Fecha actual: ${today}.
${modeInstructions}

MEMORIA RESUMIDA DE CHARLAS ANTERIORES:
${this.state.rollingSummary || 'Sin resumen previo.'}

HECHOS RECORDADOS DEL USUARIO:
${factsText}

AGENDA Y EVENTOS DE HOY:
${eventsText}`;
  }

  async appendInteraction(userText, assistantText, llmClient) {
    if (!Array.isArray(this.state.recentHistory)) {
      this.state.recentHistory = [];
    }

    this.state.recentHistory.push(
      { role: 'user', content: userText },
      { role: 'assistant', content: assistantText }
    );

    if (this.state.recentHistory.length > 12 && llmClient) {
      const oldest = this.state.recentHistory.splice(0, 4);
      const snippet = oldest.map((m) => `${m.role}: ${m.content}`).join('\n');
      try {
        const summaryPrompt = `Actualizá en máximo 4 oraciones este resumen de memoria incorporando los datos importantes del fragmento nuevo.
Resumen anterior: ${this.state.rollingSummary}
Fragmento nuevo:
${snippet}`;
        const updatedSummary = await llmClient.generate(
          summaryPrompt,
          'Sos un compresor de memoria episódica en español. Devolvé únicamente el resumen actualizado.',
          { maxTokens: 180, temperature: 0.3 }
        );
        if (updatedSummary) {
          this.state.rollingSummary = updatedSummary;
        }
      } catch (err) {
        console.warn('[personality-engine] No se pudo comprimir memoria:', err.message);
      }
    }

    this.saveState();
  }
}

module.exports = new PersonalityEngine();
