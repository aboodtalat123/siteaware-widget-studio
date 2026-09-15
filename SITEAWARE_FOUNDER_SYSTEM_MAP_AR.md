# SiteAware Founder System Map

هذا الملف يشرح الصورة الحالية للنظام بلغة واضحة، مع استخدام أسماء تقنية إنجليزية حتى تبقى قابلة للتتبع داخل الكود.

## المستودعات

- `siteaware-widget-studio`: واجهة Studio وواجهة Owner Extension Side Panel. يحتوي `App.tsx` على تجربة التصميم، المعاينة، Learn، Brain، Knowledge، Test، Assist، وSettings. الإكستنشن يبنى إلى `dist/extension`.
- `siteaware-local-integration`: الخلفية المحلية `FastAPI` التي تحمل المفاتيح والأسرار، وتدير runtime sessions، learning sessions، observation ingest، graph، knowledge، assist، guide، وAI-assisted discovery.
- `siteaware-ai-product`: مرجع المنتج الأوسع وطبقات governed agent المستقبلية. ليس هو runtime الحالي للإكستنشن.
- `SiteAware-Workspace`: مساحة تنظيم/خرائط وتقارير مرجعية، وليست تطبيق runtime مباشر.

## المسار التشغيلي الحالي

```text
Chrome Extension Side Panel
→ src/extension-entry.tsx
→ src/App.tsx
→ UnifiedSiteAwareExtensionAdapter
→ extension/service-worker.js
→ extension/content-script.js
→ http://127.0.0.1:8000
→ siteaware-local-integration/app/fastapi_app.py:create_app()
→ app/integration/routes.py
```

## D1 إلى D7

- `D1 Observation`: content script يجمع DOM/AX evidence آمن من الصفحة الحالية، بدون أسرار وبدون bodies حساسة.
- `D2 Frontier`: backend learning session يقرر routes التالية ويمنع loops حسب budgets.
- `D3 Core Safety`: backend `interactions/authorize` يقرر إذا control آمن كـstructural disclosure. الإكستنشن لا يقرر السلامة وحده.
- `D4 Network Metadata`: اختياري فقط، metadata بدون request/response bodies وبدون webRequest permission.
- `D5 Visual / AI Fallback`: visual fallback موجود كـevidence-only، وAI-assisted discovery يطلب من Gemini اقتراح candidates فقط.
- `D6 Coverage`: endpoint مستقل يرجع verdict/reasons ولا يتم استنتاجه من `session.state`.
- `D7 Reliability`: endpoint مستقل يرجع termination reason وcheckpoint.

## Graph وKnowledge

- `Graph`: يتكوّن من observations، routes، state transitions، وrelationships مثل `NAVIGATES_TO`, `DISCLOSES`, و`REVEALS` عندما تكون الأدلة متاحة.
- `Knowledge`: backend فقط، يستخدم البيانات المتعلمة أو المعرفة المضافة لتغذية Assist/Guide بإجابات grounded.

## Gemini

- مفتاح Gemini يجب أن يبقى فقط في `siteaware-local-integration/.env`.
- React، service worker، content script، وextension bundle لا يجب أن يحتوي أي key.
- provider الحالي للـAI-assisted discovery هو `gemini-discovery-v1`.
- الموديل المقصود: `gemini-3.8-flash`.

## Assist وGuide

- `Assist`: الإكستنشن يرسل السؤال إلى backend `/api/extension/v1/query` مع current page sanitized.
- `Guide`: عندما توجد graph evidence، backend يجب أن يرجع target/path/action قابل للـhighlight أو navigation guide. Stage 6 يبقى OFF، فلا يوجد تنفيذ أعمال حساسة.

## Stage 1 إلى Stage 6

- `Stage 1`: حاضر. runtime trust/scopes/permissions موجودة عبر tokens وapproved origins.
- `Stage 2`: حاضر جزئيا. discovery والauthenticated observation موجودان عبر extension + backend.
- `Stage 3`: حاضر جزئيا. semantic observation وD3 safety موجودان، self-healing محدود.
- `Stage 4`: حاضر جزئيا. graph/knowledge موجودان، لكن graph E2E يحتاج إصلاح اختبارات/fixture.
- `Stage 5`: حاضر جزئيا. assist/highlight/verify routes موجودة، live authenticated retest مطلوب.
- `Stage 6`: معطل عمدا. لا autonomous governed execution في الإكستنشن.

## ما هو Live وما هو Tested وما هو Future

- `Live`: Studio/Extension build، runtime-session endpoint، learning endpoints، query endpoint، D3 authorization endpoint، AI discovery endpoint.
- `Tested`: extension tests نجحت بالكامل. backend selected tests حاليا تفشل بسبب fixtures/contracts قديمة.
- `Live Retest Required`: تشغيل إكستنشن داخل Rousheta/approved site مع backend جديد ومفتاح Gemini صالح.
- `Future`: Stage 6 governed agent execution، أو أي click على actions حساسة مثل submit/save/delete/send/pay/upload.
