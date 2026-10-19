const llmClient = require('./llm-client');
const personalityEngine = require('./personality-engine');

class Planner {
  async fetchDailyRandomFact() {
    try {
      const res = await fetch('https://es.wikipedia.org/api/rest_v1/page/random/summary');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return `${data.title}: ${data.extract}`;
    } catch (err) {
      return 'Las abejas pueden reconocer rostros humanos individuales usando patrones visuales.';
    }
  }

  detectQuickIntent(text) {
    const lower = text.toLowerCase().trim();

    if (lower.includes('modo estudio') || lower.includes('activar estudio')) {
      return { type: 'mode_change', mode: 'study' };
    }
    if (lower.includes('examen oral') || lower.includes('tomame examen') || lower.includes('modo examen')) {
      return { type: 'mode_change', mode: 'oral_exam' };
    }
    if (lower.includes('modo normal') || lower.includes('modo jarvis')) {
      return { type: 'mode_change', mode: 'jarvis' };
    }
    if (lower.includes('dato random') || lower.includes('dato curioso') || lower.includes('datito del dia') || lower.includes('dato del día')) {
      return { type: 'daily_fact' };
    }
    if (lower.startsWith('agendá') || lower.startsWith('agenda ') || lower.startsWith('recordame que ')) {
      return { type: 'add_event', raw: text };
    }
    if (lower.includes('qué tengo que hacer hoy') || lower.includes('que tengo hoy') || lower.includes('mi agenda')) {
      return { type: 'list_events' };
    }
    return { type: 'chat' };
  }

  async delegateToHermesIfNeeded(userText) {
    if (process.env.HERMES_ENABLED !== 'true' || !process.env.HERMES_API_URL) {
      return null;
    }
    try {
      const response = await fetch(process.env.HERMES_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userText })
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.reply || data.result || null;
    } catch (err) {
      console.warn('[planner] Hermes flag activo pero no disponible, siguiendo con Chappie local:', err.message);
      return null;
    }
  }

  async processInput(userText) {
    const intent = this.detectQuickIntent(userText);

    if (intent.type === 'mode_change') {
      personalityEngine.setMode(intent.mode);
      const modeNames = {
        jarvis: 'Modo Jarvis normal activado. ¿En qué andamos hoy?',
        study: 'Modo estudio activado. Pasame el tema o preguntame lo que quieras repasar y lo vemos paso a paso.',
        oral_exam: 'Mesa de examen oral lista. Decime sobre qué tema del apunte querés que te haga la primera pregunta.'
      };
      return { reply: modeNames[intent.mode], intent: intent.type, mode: intent.mode };
    }

    if (intent.type === 'daily_fact') {
      const rawFact = await this.fetchDailyRandomFact();
      const reply = await llmClient.generate(
        `Contale a Iván este dato curioso del día con tu personalidad estilo Jarvis en 2 o 3 oraciones y hacé un comentario breve para seguir charlando:\n${rawFact}`,
        personalityEngine.buildSystemPrompt()
      );
      await personalityEngine.appendInteraction(userText, reply, llmClient);
      return { reply, intent: 'daily_fact', mode: personalityEngine.state.mode };
    }

    if (intent.type === 'add_event') {
      const eventSaved = personalityEngine.addEvent(userText);
      const reply = `Anotado en tu agenda: "${eventSaved.description}". Quedate tranquilo que yo te hago acordar.`;
      await personalityEngine.appendInteraction(userText, reply, llmClient);
      return { reply, intent: 'add_event', event: eventSaved };
    }

    if (intent.type === 'list_events') {
      const events = personalityEngine.getTodayEvents();
      const listStr = events.length
        ? events.map((e) => e.description).join('; ')
        : 'No tenés eventos pendientes cargados para hoy.';
      const reply = await llmClient.generate(
        `El usuario pregunta qué tiene agendado hoy. Respondé de forma conversacional con estos datos: ${listStr}`,
        personalityEngine.buildSystemPrompt()
      );
      await personalityEngine.appendInteraction(userText, reply, llmClient);
      return { reply, intent: 'list_events', events };
    }

    const hermesResult = await this.delegateToHermesIfNeeded(userText);
    if (hermesResult) {
      await personalityEngine.appendInteraction(userText, hermesResult, llmClient);
      return { reply: hermesResult, intent: 'hermes_task' };
    }

    const messages = [
      { role: 'system', content: personalityEngine.buildSystemPrompt() },
      ...(personalityEngine.state.recentHistory || []).slice(-10),
      { role: 'user', content: userText }
    ];

    const result = await llmClient.chat(messages);
    await personalityEngine.appendInteraction(userText, result.text, llmClient);

    return {
      reply: result.text,
      provider: result.provider,
      model: result.model,
      mode: personalityEngine.state.mode,
      stats: result.stats
    };
  }
}

module.exports = new Planner();
