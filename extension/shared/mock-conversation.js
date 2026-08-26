const scenarios = [
  {
    id: 'api-key',
    keywords: ['api key', 'api-key', 'apikey', 'مفتاح', 'api'],
    questionPatterns: ['where can i change my api key', 'وين بقدر اغير مفتاح ال api', 'وين بقدر اغير مفتاح الـ api؟'],
    answer: 'You can manage your API keys from Settings → API Keys.',
    sources: ['Settings → API Keys', 'Account Security', 'Help Center'],
    suggestions: ['View API Keys', 'Open Settings', 'Read security docs'],
    targetBehavior: 'spotlight',
  },
  {
    id: 'invoices',
    keywords: ['invoice', 'invoices', 'bill', 'billing', 'فاتورة'],
    questionPatterns: ['where can i download invoices', 'وين بلاقي الفواتير', 'where are my invoices'],
    answer: 'Invoices are available under Billing → Invoices.',
    sources: ['Billing → Invoices', 'Billing history', 'Finance Help'],
    suggestions: ['Open Billing', 'Download invoice PDF', 'View payment methods'],
    targetBehavior: 'target',
  },
  {
    id: '2fa',
    keywords: ['2fa', 'two factor', 'verification', 'التحقق'],
    questionPatterns: ['how do i enable two factor authentication', 'كيف أفعل التحقق بخطوتين', 'how to enable 2fa'],
    answer: 'Enable two-factor authentication in Security → Two-factor authentication.',
    sources: ['Security → 2FA', 'Security settings', 'Help Center'],
    suggestions: ['Open Security', 'Get backup codes', 'View supported apps'],
    targetBehavior: 'spotlight',
  },
  {
    id: 'support',
    keywords: ['support', 'help', 'contact', 'الدعم'],
    questionPatterns: ['how can i contact support', 'كيف أتواصل مع الدعم', 'contact support'],
    answer: 'You can contact support from Help Center → Contact support.',
    sources: ['Help Center', 'Contact support', 'Support hours'],
    suggestions: ['Open Help Center', 'Message support', 'Check status page'],
    targetBehavior: 'target',
  },
  {
    id: 'rtl-api',
    keywords: ['api', 'مفتاح'],
    questionPatterns: ['وين بقدر اغير مفتاح الـ api؟', 'وين بقدر اغير مفتاح api'],
    answer: 'بتقدر تغير مفتاح الـ API من الإعدادات > مفاتيح API.',
    sources: ['الإعدادات', 'مفاتيح API', 'مركز المساعدة'],
    suggestions: ['افتح الإعدادات', 'اعرض مفاتيح API', 'راجع الأمان'],
    rtl: true,
    targetBehavior: 'spotlight',
  },
  {
    id: 'rtl-invoices',
    keywords: ['فواتير', 'فاتورة'],
    questionPatterns: ['وين الفواتير؟', 'وين بلاقي الفواتير؟'],
    answer: 'الفواتير موجودة في: الفوترة > الفواتير.',
    sources: ['الفوترة', 'الفواتير', 'مركز المساعدة'],
    suggestions: ['افتح الفوترة', 'نزّل PDF', 'اعرض المدفوعات'],
    rtl: true,
    targetBehavior: 'target',
  },
  {
    id: 'rtl-2fa',
    keywords: ['التحقق', 'خطوتين'],
    questionPatterns: ['كيف أفعل التحقق بخطوتين؟', 'كيف بفعّل التحقق بخطوتين؟'],
    answer: 'فعّل التحقق بخطوتين من: الأمان > التحقق بخطوتين.',
    sources: ['الأمان', 'التحقق بخطوتين', 'مركز المساعدة'],
    suggestions: ['افتح الأمان', 'اعرض رموز النسخ الاحتياطي', 'طرق تسجيل الدخول'],
    rtl: true,
    targetBehavior: 'spotlight',
  },
];

function normalize(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[؟?!.،]/g, '')
    .replace(/\s+/g, ' ');
}

export function detectLocale(question) {
  return /[\u0600-\u06FF]/.test(question) ? 'ar' : 'en';
}

export function findScenario(question) {
  const normalized = normalize(question);
  if (!normalized) {
    return null;
  }
  const direct = scenarios.find((scenario) =>
    scenario.questionPatterns.some((pattern) => normalized.includes(normalize(pattern))),
  );
  if (direct) {
    return direct;
  }
  const keywordMatch = scenarios.find((scenario) =>
    scenario.keywords.some((keyword) => normalized.includes(normalize(keyword))),
  );
  return keywordMatch || null;
}

export function createWelcomeState(locale = 'en') {
  return {
    mode: 'welcome',
    rtl: locale === 'ar',
    suggestedQuestions:
      locale === 'ar'
        ? ['وين بقدر اغير مفتاح الـ API؟', 'وين بلاقي الفواتير؟', 'كيف أفعل التحقق بخطوتين؟']
        : ['Where can I change my API key?', 'Where can I download invoices?', 'How do I enable two-factor authentication?'],
    message:
      locale === 'ar'
        ? 'أهلاً! جرّب أحد الأسئلة المقترحة أو اسألني عن هذه الصفحة.'
        : 'Hi! Try one of the suggested questions or ask me about this page.',
  };
}

export function resolveConversation(question, context = {}) {
  const locale = detectLocale(question);
  const scenario = findScenario(question);
  const rtl = Boolean(scenario?.rtl || locale === 'ar');

  if (!question || !question.trim()) {
    return {
      mode: 'empty',
      rtl,
      answer: locale === 'ar' ? 'اكتب سؤالك لبدء التجربة.' : 'Type a question to get started.',
      suggestions: createWelcomeState(locale).suggestedQuestions,
      sources: [],
      feedbackEnabled: false,
    };
  }

  if (!scenario) {
    return {
      mode: 'no answer',
      rtl,
      answer:
        locale === 'ar'
          ? 'ما لقيت جواباً مؤكداً هنا. جرّب صياغة مختلفة أو افتح قسم آخر.'
          : 'I could not find a confident answer here. Try another section or rephrase.',
      sources: ['Help Center', 'Search page'],
      suggestions:
        locale === 'ar'
          ? ['جرّب سؤالاً آخر', 'افتح مركز المساعدة', 'اعرض الصفحة الرئيسية']
          : ['Try another question', 'Open help center', 'View the homepage'],
      feedbackEnabled: true,
      retry: true,
      targetBehavior: 'none',
    };
  }

  const answer =
    typeof scenario.answer === 'function'
      ? scenario.answer({ question, context, scenario })
      : scenario.answer;

  return {
    mode: scenario.id,
    rtl,
    answer,
    sources: scenario.sources,
    suggestions: scenario.suggestions,
    targetBehavior: scenario.targetBehavior,
    feedbackEnabled: true,
  };
}

export function getScenarioQuestionLibrary() {
  return scenarios.map((scenario) => ({
    id: scenario.id,
    examples: scenario.questionPatterns,
    rtl: Boolean(scenario.rtl),
  }));
}
