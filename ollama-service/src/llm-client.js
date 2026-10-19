require('dotenv').config();

const PRICING_PER_1M = {
  groq: { input: 0.10, output: 0.15 },
  openrouter: { input: 0.00, output: 0.00 },
  google: { input: 0.075, output: 0.30 },
  deepseek: { input: 0.14, output: 0.28 }
};

class LLMClient {
  constructor() {
    this.usageStats = {
      totalCalls: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      estimatedCostUSD: 0,
      byProvider: {}
    };
  }

  getProvidersChain() {
    const allProviders = [
      {
        name: 'groq',
        enabled: Boolean(process.env.GROQ_API_KEY),
        url: 'https://api.groq.com/openai/v1/chat/completions',
        apiKey: process.env.GROQ_API_KEY,
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b'
      },
      {
        name: 'openrouter',
        enabled: Boolean(process.env.OPENROUTER_API_KEY),
        url: 'https://openrouter.ai/api/v1/chat/completions',
        apiKey: process.env.OPENROUTER_API_KEY,
        model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free'
      },
      {
        name: 'deepseek',
        enabled: Boolean(process.env.DEEPSEEK_API_KEY),
        url: 'https://api.deepseek.com/v1/chat/completions',
        apiKey: process.env.DEEPSEEK_API_KEY,
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat'
      },
      {
        name: 'google',
        enabled: Boolean(process.env.GOOGLE_API_KEY),
        url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        apiKey: process.env.GOOGLE_API_KEY,
        model: process.env.GOOGLE_MODEL || 'gemini-2.5-flash'
      }
    ];

    const primary = process.env.LLM_PRIMARY_PROVIDER || 'groq';
    const sorted = allProviders.sort((a, b) => (a.name === primary ? -1 : b.name === primary ? 1 : 0));
    return sorted.filter((p) => p.enabled);
  }

  recordUsage(providerName, usage = {}) {
    const inTokens = usage.prompt_tokens || 0;
    const outTokens = usage.completion_tokens || 0;
    const rates = PRICING_PER_1M[providerName] || { input: 0, output: 0 };
    const callCost = (inTokens / 1_000_000) * rates.input + (outTokens / 1_000_000) * rates.output;

    this.usageStats.totalCalls += 1;
    this.usageStats.totalInputTokens += inTokens;
    this.usageStats.totalOutputTokens += outTokens;
    this.usageStats.estimatedCostUSD = Number((this.usageStats.estimatedCostUSD + callCost).toFixed(6));

    if (!this.usageStats.byProvider[providerName]) {
      this.usageStats.byProvider[providerName] = { calls: 0, inputTokens: 0, outputTokens: 0, costUSD: 0 };
    }
    this.usageStats.byProvider[providerName].calls += 1;
    this.usageStats.byProvider[providerName].inputTokens += inTokens;
    this.usageStats.byProvider[providerName].outputTokens += outTokens;
    this.usageStats.byProvider[providerName].costUSD = Number(
      (this.usageStats.byProvider[providerName].costUSD + callCost).toFixed(6)
    );
  }

  async chat(messages, options = {}) {
    const providers = this.getProvidersChain();
    if (providers.length === 0) {
      throw new Error('No hay ninguna API key configurada en el archivo .env (ej. GROQ_API_KEY).');
    }

    let lastError = null;

    for (const provider of providers) {
      try {
        const headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provider.apiKey}`
        };

        if (provider.name === 'openrouter') {
          headers['HTTP-Referer'] = 'https://github.com/Ivan-rgb-ops/Chappie-bot';
          headers['X-Title'] = 'Chappie-bot';
        }

        const body = {
          model: options.model || provider.model,
          messages,
          temperature: options.temperature ?? 0.65,
          max_tokens: options.maxTokens ?? 450
        };

        if (options.jsonMode) {
          body.response_format = { type: 'json_object' };
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 15000);

        const response = await fetch(provider.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`[${provider.name}] HTTP ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim() || '';
        this.recordUsage(provider.name, data.usage);

        return {
          text: content,
          provider: provider.name,
          model: body.model,
          usage: data.usage || {},
          stats: this.usageStats
        };
      } catch (err) {
        console.warn(`[llm-client] Falló ${provider.name}, probando siguiente fallback... Motivo: ${err.message}`);
        lastError = err;
      }
    }

    throw new Error(`Todos los proveedores fallaron. Último error: ${lastError?.message}`);
  }

  async generate(prompt, systemPrompt = '', options = {}) {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });
    const res = await this.chat(messages, options);
    return res.text;
  }

  getStats() {
    return this.usageStats;
  }
}

module.exports = new LLMClient();
