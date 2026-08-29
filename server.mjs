import { createReadStream, existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(projectRoot, 'dist');
const publicPort = Number(process.env.PORT ?? 8787);
const geminiKey = process.env.GEMINI_API_KEY?.trim() ?? '';
const geminiModel = process.env.GEMINI_MODEL?.trim() || 'gemini-3.7-flash';
const geminiFallbackModel = process.env.GEMINI_FALLBACK_MODEL?.trim() || 'gemini-3.6-flash';

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.mjs', 'application/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
]);

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function sendText(res, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function getMimeType(filePath) {
  return mimeTypes.get(path.extname(filePath).toLowerCase()) ?? 'application/octet-stream';
}

function safeReadJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8').trim();
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function extractGeminiText(payload) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const outputs = Array.isArray(payload.outputs) ? payload.outputs : [];
  for (const output of outputs) {
    if (output && typeof output.text === 'string' && output.text.trim()) {
      return output.text.trim();
    }
  }

  const steps = Array.isArray(payload.steps) ? payload.steps : [];
  for (const step of steps) {
    if (!step || typeof step !== 'object') {
      continue;
    }
    if (step.type === 'model_output') {
      if (Array.isArray(step.content)) {
        for (const item of step.content) {
          if (item && typeof item.text === 'string' && item.text.trim()) {
            return item.text.trim();
          }
        }
      }
      if (typeof step.text === 'string' && step.text.trim()) {
        return step.text.trim();
      }
    }
  }

  if (typeof payload.text === 'string' && payload.text.trim()) {
    return payload.text.trim();
  }

  return '';
}

function normalizeConversation(conversation) {
  if (!Array.isArray(conversation)) {
    return [];
  }
  return conversation
    .filter((message) => message && typeof message === 'object')
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      text: typeof message.text === 'string' ? message.text.trim() : '',
    }))
    .filter((message) => message.text.length > 0)
    .slice(-10);
}

function buildPrompt(body) {
  const locale = body?.locale === 'ar' ? 'ar' : 'en';
  const site = body?.site && typeof body.site === 'object' ? body.site : {};
  const config = body?.config && typeof body.config === 'object' ? body.config : {};
  const conversation = normalizeConversation(body?.conversation);
  const latestQuestion = typeof body?.composer === 'string' ? body.composer.trim() : '';
  const siteName = typeof site.name === 'string' ? site.name : 'the current site';
  const siteVibe = typeof site.vibe === 'string' ? site.vibe : 'product';
  const iconId = typeof config.assistantIcon === 'string' ? config.assistantIcon : 'unknown';
  const chatShellId = typeof config.chatShell === 'string' ? config.chatShell : 'unknown';
  const launcherId = typeof config.launcher === 'string' ? config.launcher : 'unknown';
  const transcript = conversation
    .map((message) => `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${message.text}`)
    .join('\n');

  const rules =
    locale === 'ar'
      ? [
          'أنت مساعد SiteAware داخل واجهة تصميم. جاوب بالعربي بشكل طبيعي ومختصر ومفيد.',
          'لا تستخدم جدول. لا تذكر أنك نموذج. لا تحشو كلامًا زائدًا.',
          'إذا كان السؤال عن واجهة أو شكل، اربط الجواب بما هو ظاهر في التصميم الحالي.',
        ]
      : [
          'You are the SiteAware assistant inside a design studio. Reply in natural, concise, helpful English.',
          'Do not use tables. Do not mention being a model. Keep it practical.',
          'If the question is about the UI or shape, tie the answer to the current design choices.',
        ];

  return [
    ...rules,
    '',
    `Current site: ${siteName}`,
    `Site vibe: ${siteVibe}`,
    `Selected icon: ${iconId}`,
    `Selected chat shell: ${chatShellId}`,
    `Selected launcher: ${launcherId}`,
    '',
    'Conversation history:',
    transcript || '(none yet)',
    '',
    `Latest user message: ${latestQuestion}`,
    '',
    locale === 'ar'
      ? 'اكتب جوابًا واحدًا واضحًا. إذا احتجت تفاصيل، استخدم نقطتين أو ثلاث فقط.'
      : 'Write one clear reply. If you need structure, use only two or three short bullets.',
  ].join('\n');
}

function buildDesignPrompt(body) {
  const locale = body?.locale === 'ar' ? 'ar' : 'en';
  const site = body?.site && typeof body.site === 'object' ? body.site : {};
  const config = body?.config && typeof body.config === 'object' ? body.config : {};
  const catalog = body?.catalog && typeof body.catalog === 'object' ? body.catalog : {};
  const userPrompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
  const themeMode = body?.themeMode === 'dark' ? 'dark' : 'light';
  const siteName = typeof site.name === 'string' ? site.name : 'Current site';
  const siteVibe = typeof site.vibe === 'string' ? site.vibe : 'General website';

  const instructions =
    locale === 'ar'
      ? [
          'أنت SiteAware AI Designer داخل استوديو تصميم مساعد مواقع.',
          'مهمتك تحويل طلب المستخدم إلى JSON فقط، بدون أي شرح خارجي أو markdown.',
          'اختر القيم فقط من الكتالوج المسموح الموجود في الرسالة.',
          'إذا طلب المستخدم واجهة بيضاء أو عادية ففضّل الثيمات الفاتحة أو الأسود/الأبيض.',
          'حافظ على الفكرة الأساسية: الأيقونة في أقصى اليمين والمحادثة في أقصى اليسار.',
          'إذا لم يلزم حقل معيّن فلا تضعه داخل patch.',
        ]
      : [
          'You are the SiteAware AI Designer inside a website assistant studio.',
          'Convert the user request into JSON only with no markdown or extra prose.',
          'Pick values only from the allowed catalog included in the request.',
          'If the user asks for a white or normal site, prefer light or black-and-white themes.',
          'Preserve the core layout intent: launcher at the far right, assistant at the far left.',
          'If a field is not necessary, omit it from patch.',
        ];

  const schemaNote =
    locale === 'ar'
      ? `أرجع JSON بهذا الشكل:
{
  "summary": "ملخص قصير",
  "reasoning": ["سبب 1", "سبب 2"],
  "patch": {
    "assistantIcon": "id",
    "launcher": "id",
    "chatShell": "id",
    "header": "id",
    "assistantMessage": "id",
    "userMessage": "id",
    "inputBar": "id",
    "sendButton": "id",
    "sourceCitation": "id",
    "takeMeThere": "id",
    "theme": "id",
    "themeMode": "light or dark",
    "widgetOpen": true,
    "focusCategory": "assistantIcon or launcher or chatShell ...",
    "appearance": {
      "radius": "sm|md|lg|xl",
      "widgetWidth": 420,
      "widgetHeight": 620,
      "density": "compact|comfortable|spacious",
      "fontScale": 1,
      "shadowStrength": 0.8,
      "launcherSize": "sm|md|lg",
      "launcherPosition": "bottom-right|bottom-left|left-edge|right-edge",
      "primaryColor": "#112233"
    }
  }
}`
      : `Return JSON in this shape:
{
  "summary": "short summary",
  "reasoning": ["reason 1", "reason 2"],
  "patch": {
    "assistantIcon": "id",
    "launcher": "id",
    "chatShell": "id",
    "header": "id",
    "assistantMessage": "id",
    "userMessage": "id",
    "inputBar": "id",
    "sendButton": "id",
    "sourceCitation": "id",
    "takeMeThere": "id",
    "theme": "id",
    "themeMode": "light or dark",
    "widgetOpen": true,
    "focusCategory": "assistantIcon or launcher or chatShell ...",
    "appearance": {
      "radius": "sm|md|lg|xl",
      "widgetWidth": 420,
      "widgetHeight": 620,
      "density": "compact|comfortable|spacious",
      "fontScale": 1,
      "shadowStrength": 0.8,
      "launcherSize": "sm|md|lg",
      "launcherPosition": "bottom-right|bottom-left|left-edge|right-edge",
      "primaryColor": "#112233"
    }
  }
}`;

  return [
    ...instructions,
    '',
    `Current site: ${siteName}`,
    `Site vibe: ${siteVibe}`,
    `Current theme mode: ${themeMode}`,
    `Current config: ${JSON.stringify(config)}`,
    '',
    `Allowed catalog: ${JSON.stringify(catalog)}`,
    '',
    `User request: ${userPrompt}`,
    '',
    schemaNote,
  ].join('\n');
}

function extractJsonObject(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return null;
  }

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1] ?? text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function isRetryableGeminiFailure(status, message) {
  return status === 429 || status === 503 || status === 504 || /high demand|temporar|rate limit|overload|timed? out|timeout/i.test(message);
}

async function requestGemini(model, prompt) {
  let geminiResponse;
  try {
    geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiKey,
      },
      body: JSON.stringify({ model, input: prompt }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return {
      ok: false,
      status: timedOut ? 504 : 502,
      parsed: null,
      rawText: '',
      message: timedOut ? `${model} timed out after 30 seconds.` : error instanceof Error ? error.message : 'Gemini connection failed.',
    };
  }

  const rawText = await geminiResponse.text();
  let parsed = null;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = null;
  }

  return {
    ok: geminiResponse.ok,
    status: geminiResponse.status,
    parsed,
    rawText,
    message: parsed?.error?.message ?? (rawText || 'Gemini request failed.'),
  };
}

async function handleChat(request, response) {
  if (!geminiKey) {
    sendJson(response, 503, {
      ok: false,
      mode: 'missing_key',
      provider: 'gemini',
      model: geminiModel,
      reply: '',
      message: 'GEMINI_API_KEY is missing.',
    });
    return;
  }

  let body;
  try {
    body = await safeReadJson(request);
  } catch {
    sendJson(response, 400, {
      ok: false,
      mode: 'error',
      provider: 'gemini',
      model: geminiModel,
      reply: '',
      message: 'Invalid JSON payload.',
    });
    return;
  }

  const prompt = buildPrompt(body);

  try {
    const candidateModels = [...new Set([geminiModel, geminiFallbackModel].filter(Boolean))];
    let lastFailure = null;

    for (const model of candidateModels) {
      const result = await requestGemini(model, prompt);
      if (result.ok) {
        const reply = extractGeminiText(result.parsed) || result.rawText.trim();
        sendJson(response, 200, {
          ok: true,
          mode: 'ready',
          provider: 'gemini',
          model,
          fallbackUsed: model !== geminiModel,
          reply,
          message: model === geminiModel ? 'Gemini reply generated.' : `Gemini reply generated with fallback model ${model}.`,
        });
        return;
      }

      lastFailure = { ...result, model };
      if (!isRetryableGeminiFailure(result.status, result.message)) {
        break;
      }
    }

    sendJson(response, lastFailure?.status ?? 502, {
      ok: false,
      mode: 'error',
      provider: 'gemini',
      model: lastFailure?.model ?? geminiModel,
      reply: '',
      message: lastFailure?.message ?? 'Gemini request failed.',
    });
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      mode: 'error',
      provider: 'gemini',
      model: geminiModel,
      reply: '',
      message: error instanceof Error ? error.message : 'Unexpected Gemini failure.',
    });
  }
}

async function handleDesign(request, response) {
  if (!geminiKey) {
    sendJson(response, 503, {
      ok: false,
      mode: 'missing_key',
      provider: 'gemini',
      model: geminiModel,
      message: 'GEMINI_API_KEY is missing.',
    });
    return;
  }

  let body;
  try {
    body = await safeReadJson(request);
  } catch {
    sendJson(response, 400, {
      ok: false,
      mode: 'error',
      provider: 'gemini',
      model: geminiModel,
      message: 'Invalid JSON payload.',
    });
    return;
  }

  const prompt = buildDesignPrompt(body);

  try {
    const candidateModels = [...new Set([geminiModel, geminiFallbackModel].filter(Boolean))];
    let lastFailure = null;

    for (const model of candidateModels) {
      const result = await requestGemini(model, prompt);
      if (result.ok) {
        const rawReply = extractGeminiText(result.parsed) || result.rawText.trim();
        const parsed = extractJsonObject(rawReply);
        if (!parsed || typeof parsed !== 'object') {
          sendJson(response, 502, {
            ok: false,
            mode: 'error',
            provider: 'gemini',
            model,
            message: 'Gemini returned a non-JSON design response.',
          });
          return;
        }

        sendJson(response, 200, {
          ok: true,
          mode: 'ready',
          provider: 'gemini',
          model,
          message: model === geminiModel ? 'Gemini design patch generated.' : `Gemini design patch generated with fallback model ${model}.`,
          summary: typeof parsed.summary === 'string' ? parsed.summary : '',
          reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning.filter((item) => typeof item === 'string').slice(0, 4) : [],
          patch: parsed.patch && typeof parsed.patch === 'object' ? parsed.patch : {},
        });
        return;
      }

      lastFailure = { ...result, model };
      if (!isRetryableGeminiFailure(result.status, result.message)) {
        break;
      }
    }

    sendJson(response, lastFailure?.status ?? 502, {
      ok: false,
      mode: 'error',
      provider: 'gemini',
      model: lastFailure?.model ?? geminiModel,
      message: lastFailure?.message ?? 'Gemini design request failed.',
    });
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      mode: 'error',
      provider: 'gemini',
      model: geminiModel,
      message: error instanceof Error ? error.message : 'Unexpected Gemini design failure.',
    });
  }
}

async function serveStatic(request, response, pathname) {
  let filePath = path.join(distDir, pathname);
  if (pathname === '/' || pathname === '') {
    filePath = path.join(distDir, 'index.html');
  }

  if (filePath.includes('..')) {
    sendText(response, 400, 'Bad request');
    return;
  }

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    response.writeHead(200, {
      'Content-Type': getMimeType(filePath),
      'Cache-Control': filePath.endsWith('.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    createReadStream(filePath).pipe(response);
    return;
  }

  const indexPath = path.join(distDir, 'index.html');
  if (existsSync(indexPath)) {
    const html = await readFile(indexPath, 'utf8');
    sendText(response, 200, html, 'text/html; charset=utf-8');
    return;
  }

  sendText(response, 404, 'Build output not found. Run npm run build first.');
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const { pathname } = url;

  if (pathname === '/api/health') {
    sendJson(response, 200, {
      ok: true,
      mode: geminiKey ? 'ready' : 'missing_key',
      provider: 'gemini',
      model: geminiModel,
      message: geminiKey ? 'Gemini backend ready.' : 'Set GEMINI_API_KEY to enable live replies.',
    });
    return;
  }

  if (pathname === '/api/chat') {
    if (request.method !== 'POST') {
      sendJson(response, 405, {
        ok: false,
        mode: 'error',
        provider: 'gemini',
        model: geminiModel,
        reply: '',
        message: 'Use POST for /api/chat.',
      });
      return;
    }

    await handleChat(request, response);
    return;
  }

  if (pathname === '/api/design') {
    if (request.method !== 'POST') {
      sendJson(response, 405, {
        ok: false,
        mode: 'error',
        provider: 'gemini',
        model: geminiModel,
        message: 'Use POST for /api/design.',
      });
      return;
    }

    await handleDesign(request, response);
    return;
  }

  if (pathname.startsWith('/api/')) {
    sendJson(response, 404, {
      ok: false,
      mode: 'error',
      provider: 'gemini',
      model: geminiModel,
      reply: '',
      message: 'Unknown API route.',
    });
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendText(response, 405, 'Method not allowed');
    return;
  }

  await serveStatic(request, response, pathname);
});

server.listen(publicPort, '0.0.0.0', () => {
  console.log(`SiteAware server listening on http://localhost:${publicPort}`);
});
