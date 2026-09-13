const https = require('https');
const http = require('http');

function postJson(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const lib = target.protocol === 'https:' ? https : http;
    const payload = JSON.stringify(body);
    const req = lib.request(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers
      }
    }, res => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', c => text += c);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          let detail = '';
          try {
            const parsed = JSON.parse(text);
            detail = parsed?.error?.message || parsed?.error?.status || '';
          } catch {}
          const err = new Error(`AI provider HTTP ${res.statusCode}${detail ? `: ${detail}` : ''}`);
          err.statusCode = res.statusCode;
          reject(err);
          return;
        }
        try { resolve(JSON.parse(text)); }
        catch { reject(new Error('AI provider returned non-JSON data')); }
      });
    });
    req.setTimeout(30000, () => req.destroy(new Error('AI provider timeout')));
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function cleanKey(value) {
  let key = String(value || '').trim();
  const match = key.match(/^export\s+(?:TARA_AI_API_KEY|OPENAI_API_KEY|GEMINI_API_KEY)\s*=\s*(.+)$/i);
  if (match) key = match[1].trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) key = key.slice(1, -1).trim();
  if (!key || key.startsWith('<') || ['OPENAI_API_KEY', 'GEMINI_API_KEY'].includes(key)) return '';
  return key;
}

function getProviderConfig() {
  const geminiKey = cleanKey(process.env.GEMINI_API_KEY);
  const explicitProvider = String(process.env.TARA_AI_PROVIDER || '').trim().toLowerCase();
  const useGemini = explicitProvider === 'gemini' || (!explicitProvider && Boolean(geminiKey));

  if (useGemini) {
    return {
      provider: 'gemini',
      key: geminiKey,
      url: process.env.TARA_AI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      model: process.env.TARA_AI_MODEL || 'gemini-2.5-flash-lite'
    };
  }

  return {
    provider: 'openai',
    key: cleanKey(process.env.TARA_AI_API_KEY || process.env.OPENAI_API_KEY),
    url: process.env.TARA_AI_API_URL || process.env.OPENAI_API_URL || 'https://api.openai.com/v1/responses',
    model: process.env.TARA_AI_MODEL || process.env.OPENAI_MODEL || 'gpt-5.6-luna'
  };
}

const SYSTEM = `You are Tara AI, a warm, intelligent market companion. Speak naturally like a thoughtful, respectful human colleague: clear, conversational, calm and concise. Never pretend to be human. Never invent live or historical market numbers, news, filings, or sources. If current data is unavailable, say so plainly. For market questions distinguish facts, interpretation, scenarios and uncertainty. Do not guarantee profits or outcomes.

Tara supports these 15 languages: English, Hindi, Telugu, Marathi, Tamil, Bengali, Gujarati, Kannada, Malayalam, Punjabi, Odia, Assamese, Urdu, Konkani and Nepali. Detect the language of the user's latest message and reply in that language by default. If the user explicitly asks for a different language, use that language. Mixed-language messages are allowed; reply naturally in the dominant/requested language. Preserve stock symbols, company names, ticker codes, numbers and financial terminology accurately. Do not translate ticker symbols or official company names unless the user asks. If the user asks to change language, acknowledge briefly and continue in the requested language.`;

function extractResponseText(raw) {
  if (typeof raw?.output_text === 'string' && raw.output_text.trim()) return raw.output_text.trim();
  if (Array.isArray(raw?.output)) {
    const parts = [];
    for (const item of raw.output) {
      if (!Array.isArray(item?.content)) continue;
      for (const part of item.content) if (typeof part?.text === 'string') parts.push(part.text);
    }
    if (parts.length) return parts.join('\n').trim();
  }
  return raw?.choices?.[0]?.message?.content || raw?.response || '';
}

function providerDiagnosis(error) {
  const status = Number(error?.statusCode || 0);
  const message = String(error?.message || '').toLowerCase();
  if (status === 401 || message.includes('invalid api key') || message.includes('incorrect api key') || message.includes('api key')) return 'invalid_api_key';
  if (status === 429 || message.includes('quota') || message.includes('rate limit') || message.includes('billing') || message.includes('resource exhausted')) return 'quota_or_rate_limit';
  if (status === 403 || message.includes('permission') || message.includes('forbidden')) return 'permission_denied';
  if (status === 404 || message.includes('model') || message.includes('not found')) return 'model_or_endpoint';
  if (message.includes('timeout')) return 'provider_timeout';
  return 'provider_error';
}

function registerAIChatRoutes(app) {
  app.get('/api/ai/status', (req, res) => {
    const config = getProviderConfig();
    res.set('Cache-Control', 'no-store');
    res.json({
      success: true,
      configured: Boolean(config.key),
      provider: config.provider,
      endpoint: config.url,
      model: config.model,
      voice: 'browser-speech-ready',
      languages: ['en','hi','te','mr','ta','bn','gu','kn','ml','pa','or','as','ur','gom','ne']
    });
  });

  app.post('/api/ai/chat', async (req, res) => {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    if (!messages.length) return res.status(400).json({ success: false, error: 'Message is required' });

    const safe = messages.slice(-20)
      .map(m => ({
        role: m?.role === 'assistant' ? 'assistant' : 'user',
        content: String(m?.content || '').slice(0, 4000)
      }))
      .filter(m => m.content);

    if (!safe.length) return res.status(400).json({ success: false, error: 'Message is required' });

    const config = getProviderConfig();
    if (!config.key) {
      return res.status(503).json({
        success: false,
        ai: false,
        error: config.provider === 'gemini'
          ? 'Tara AI brain is not connected. In Render, set GEMINI_API_KEY to your Gemini API key, then redeploy.'
          : 'Tara AI brain is not connected. In Render, set GEMINI_API_KEY for the free Gemini provider, then redeploy.'
      });
    }

    try {
      const input = safe.map(m => ({ role: m.role, content: m.content }));
      const raw = await postJson(config.url, {
        model: config.model,
        messages: [
          { role: 'system', content: SYSTEM },
          ...input
        ],
        max_tokens: 900,
        temperature: 0.4
      }, { Authorization: `Bearer ${config.key}` });

      const text = extractResponseText(raw);
      if (!text) throw new Error('AI provider returned no response');

      res.set('Cache-Control', 'no-store');
      res.json({ success: true, ai: true, provider: config.provider, reply: String(text), model: config.model, asOf: new Date().toISOString() });
    } catch (e) {
      const diagnosis = providerDiagnosis(e);
      console.error('[Tara AI] Provider error:', config.provider, diagnosis, e?.message || e);
      res.status(502).json({
        success: false,
        ai: false,
        provider: config.provider,
        diagnosis,
        error: config.provider === 'gemini'
          ? 'Tara AI could not reach Gemini. Check the Render GEMINI_API_KEY, Gemini free-tier quota, and model configuration.'
          : 'Tara AI could not reach the AI provider. Check the Render API key, billing/permissions, and model configuration.'
      });
    }
  });
}

module.exports = { registerAIChatRoutes };
