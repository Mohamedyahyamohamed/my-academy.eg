# دليل إضافة Excel الحقيقي واختبار WhatsApp Sandbox في MYAcademy

## أولًا: دعم ملفات `.xlsx` بجانب CSV

### القرار المقترح

أبقي CSV مدعومًا كما هو، وأضيف قراءة `.xlsx` في المتصفح باستخدام SheetJS Community Edition. هذا مناسب لأن الملف يقرأ محليًا داخل المتصفح، ثم يحول أول ورقة إلى نفس `ImportRow[]` الذي يستخدمه الاستيراد الحالي. توثيق SheetJS يوضح أن `readFile` لا يعمل في المتصفح، وأن الطريقة الصحيحة هي قراءة `File.arrayBuffer()` ثم تمرير `ArrayBuffer` إلى `XLSX.read` [1].

### 1. تثبيت الاعتمادية

من مجلد المشروع:

```bash
pnpm add xlsx
```

لا نحتاج إلى رفع ملف Excel إلى الخادم إذا كان التحويل يتم في المتصفح. يظل الخادم مسؤولًا عن التحقق النهائي، الصلاحيات، الأكاديمية، التكرار، وإدخال الصفوف.

### 2. توسيع input وقائمة الملفات

في مكوّن `components/students/import-students.tsx`، اجعل input يقبل النوعين:

```tsx
<input
  type="file"
  accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  onChange={handleFileChange}
/>
```

يجب أن تعرض الواجهة بوضوح: «CSV أو Excel (.xlsx)». لا تسمح حاليًا بـ`.xls` أو`.xlsm` إلا بعد اختبار منفصل؛ المطلوب الحالي هو `.xlsx` فقط.

### 3. إضافة parser موحد

أنشئ دالة عميلة مثل `lib/student-import-parser.ts` أو داخل المكوّن، وتعيد نفس الشكل الذي ينتظره `importStudentsAction`:

```ts
import * as XLSX from "xlsx";

export type ImportRow = {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
};

const HEADER_ALIASES: Record<string, keyof ImportRow> = {
  firstname: "firstName",
  "first name": "firstName",
  الاسم: "firstName",
  lastname: "lastName",
  "last name": "lastName",
  اللقب: "lastName",
  phone: "phone",
  telephone: "phone",
  الهاتف: "phone",
  email: "email",
  البريد: "email",
  parentname: "parentName",
  parentphone: "parentPhone",
  parentemail: "parentEmail",
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[ًٌٍَُِّْ]/g, "")
    .replace(/[ـ\s_\-]+/g, "");
}

export async function parseXlsx(file: File): Promise<ImportRow[]> {
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error("Unsupported file type");
  }
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, {
    type: "array",
    cellDates: true,
    dense: true,
    sheets: 0,
  });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error("The workbook has no worksheet");
  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  return rawRows.map((raw) => {
    const row: Partial<ImportRow> = {};
    for (const [key, value] of Object.entries(raw)) {
      const target = HEADER_ALIASES[normalizeHeader(key)];
      if (target) row[target] = String(value ?? "").trim();
    }
    return {
      firstName: row.firstName ?? "",
      lastName: row.lastName ?? "",
      phone: row.phone || undefined,
      email: row.email || undefined,
      parentName: row.parentName || undefined,
      parentPhone: row.parentPhone || undefined,
      parentEmail: row.parentEmail || undefined,
    };
  });
}
```

في التطبيق الفعلي يجب توحيد أسماء الأعمدة مع أسماء CSV الحالية بدل نسخ aliases مختلفة. والأفضل أن تكون هناك دالة `parseImportFile(file)` تختار parser حسب الامتداد ثم تمرر CSV وXLSX إلى نفس preview وServer Action.

### 4. قواعد التحقق الضرورية

يجب ألا يعتمد الخادم على التحقق الموجود في المتصفح. قبل الإدخال، يتحقق `importStudentsAction` من أن المستخدم مصادق، وأن لديه صلاحية إدارة الطلاب، وأن `academy_id` مأخوذ من الجلسة لا من الملف. يجب رفض الصفوف التي لا تحتوي الاسم الأول واسم العائلة، تطبيع الهاتف، كشف التكرارات داخل الملف وقاعدة البيانات، وإظهار رقم الصف ورسالة الخطأ.

يجب وضع حد صريح لحجم الملف، مثل 10MB أو قيمة منتجية معلنة، وحد أقصى للصفوف مثل 1,000. إذا كان الملف أكبر، يجب أن تظهر رسالة مفهومة بدل انتهاء مهلة الطلب. SheetJS يدعم خيارات مثل `sheetRows` لتحديد عدد الصفوف المقروءة، و`sheets` لاختيار ورقة محددة، و`cellDates` للتحكم في التواريخ [2].

### 5. تجربة المستخدم المقترحة

تكون الرحلة: اختيار الملف، قراءة الملف محليًا، عرض اسم الورقة وعدد الصفوف، معاينة أول 20 صفًا، عرض الأعمدة المفقودة والأخطاء، ثم زر «استيراد 127 طالبًا». بعد الإرسال يعرض النظام عدد الصفوف الناجحة، المكررة، الفاشلة، وأرقام الصفوف التي تحتاج تصحيحًا. أضف رابط «تحميل نموذج Excel» بنفس أسماء الأعمدة المدعومة.

### 6. اختبار XLSX قبل اعتماده

يجب إنشاء ملف اختبار اصطناعي يحتوي على 120 طالبًا، من بينهم صفوف عربية، أرقام هاتف تبدأ بصفر، بريدان مكرران، صف ناقص الاسم، وصف يحتوي فاصلة داخل حقل. الاختبارات المطلوبة هي: قراءة 120 صفًا، عدم سقوط الصف الأخير، الحفاظ على الصفر في الهاتف، اكتشاف التكرار، ظهور رقم الصف في الخطأ، وإدخال العدد الصحيح فقط في بيئة اختبار منفصلة. لا ينبغي تنفيذ اختبار إدخال 120 طالبًا في الإنتاج.

معيار Pass هو أن تكون نتيجة preview مساوية لعدد الصفوف في الملف، وأن يساوي مجموع `imported + duplicate + failed` عدد الصفوف القابلة للمعالجة، مع تطابق أسماء الطلاب وأرقام الهواتف بعد التطبيع.

## ثانيًا: تفعيل WhatsApp عبر Sandbox آمن

### القرار التشغيلي

استخدم WhatsApp Cloud API في Meta Developers مع رقم الاختبار والمستلمين المسموحين في لوحة Meta، ولا تستخدم رقم العملاء أو رقم الإنتاج أثناء التجربة. مسار Meta الرسمي يتضمن إنشاء تطبيق WhatsApp، البدء بالـAPI، إرسال واستقبال الرسائل، وإعداد test webhook قبل الإنتاج [3].

### 1. إنشاء بيئة Meta اختبارية

افتح [Meta for Developers](https://developers.facebook.com/)، وأنشئ App من نوع Business، ثم أضف منتج WhatsApp. من صفحة API Setup استخدم الرقم التجريبي الذي توفره Meta، وأضف أرقام فريقك فقط إلى قائمة test recipients. لا تضف أرقام أولياء الأمور الحقيقيين.

سجّل القيم في Vercel أو secret manager الخاص ببيئة Preview فقط، وليس في GitHub أو ملفات العميل:

```text
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_BUSINESS_ACCOUNT_ID
WHATSAPP_VERIFY_TOKEN
WHATSAPP_APP_SECRET
WHATSAPP_MODE=sandbox
WHATSAPP_ALLOWED_TEST_RECIPIENTS=+2010..., +2011...
```

يجب أن يكون `WHATSAPP_MODE=sandbox` شرطًا إلزاميًا في مسار الإرسال. إذا كان الوضع sandbox، ارفض أي recipient غير موجود في allowlist، وأعد event ID بدل إرسال عشوائي.

### 2. إعداد Webhook

يجب أن يكون callback URL عامًا عبر HTTPS، مثل:

```text
https://preview.example.com/api/whatsapp/webhook
```

في Meta، أدخل Callback URL وVerify Token. أثناء الحفظ ترسل Meta طلب GET للتحقق من endpoint؛ يجب أن يعيد التطبيق قيمة `hub.challenge` فقط عندما يطابق `hub.verify_token` السر الموجود في البيئة [4]. بعد نجاح التحقق، اشترك في حقل `messages` من كائن WhatsApp Business Account. توثيق Meta يصف أحداث webhook كطلبات JSON يرسلها النظام إلى endpoint التطبيق [5].

في POST يجب التحقق من توقيع `X-Hub-Signature-256` باستخدام `WHATSAPP_APP_SECRET` قبل معالجة payload. سجّل `wamid`, event type, received_at, processing status وerror code دون تسجيل token أو نصوص حساسة أكثر من اللازم. اجعل معالجة event idempotent حتى لا يتكرر الإشعار عند إعادة Meta المحاولة.

### 3. اختبار الإرسال الآمن

نفّذ الاختبار بهذا الترتيب:

| الاختبار | النتيجة المطلوبة |
|---|---|
| GET verification | HTTP 200 و`hub.challenge` فقط عند verify token الصحيح، ورفض token الخاطئ |
| إرسال رسالة إلى test recipient | HTTP 200 من Meta ووجود `wamid` محفوظ |
| وصول الرسالة | وصولها إلى هاتف الاختبار فقط |
| delivery/read webhook | تحديث event إلى `delivered` ثم `read` إن توفر ذلك |
| recipient خارج allowlist | رفض محلي قبل استدعاء Meta |
| token خاطئ أو signature خاطئة | HTTP 401/403 وعدم إنشاء notification |
| تكرار نفس event | لا ينتج رسالة ثانية |
| Meta timeout/retry | لا ينتج duplicate بسبب idempotency |
| `WHATSAPP_MODE=production` في Preview | فشل startup أو health check، وليس إرسالًا حيًا |

لا تختبر من زر «إرسال لكل أولياء الأمور». أضف أولًا زرًا إداريًا مخفيًا خلف `sandbox=true` أو استخدم script داخلي يرسل template اختبارًا إلى رقم واحد في allowlist.

### 4. اختبار قالب الرسالة

للإشعارات الاستباقية خارج نافذة المحادثة، جهّز WhatsApp Message Template معتمدًا في Meta، مثل إشعار غياب أو تذكير حصة. اختبر اللغة العربية والإنجليزية، المتغيرات الفارغة، رقم هاتف بصيغة E.164، والفشل عند وجود ولي أمر بلا WhatsApp opt-in. يجب ألا يعتمد التطبيق على WhatsApp كقناة وحيدة؛ خزّن notification status ووفّر fallback داخل المنصة.

### 5. الانتقال من Sandbox إلى Production

لا تنتقل إلى الإنتاج إلا بعد نجاح جميع اختبارات الجدول، ومراجعة قائمة recipients، وربط WABA ورقم الإنتاج، وتثبيت webhook production URL، وتبديل secrets في Production فقط. افصل قيم Preview عن Production، وابدأ بـfeature flag داخلي يفعّل الإرسال لعدد محدود جدًا من الأكاديميات. راقب معدل الفشل وduplicate وdelivery لمدة تجريبية قبل التوسع.

## الخلاصة

إضافة XLSX آمنة ومباشرة إذا ظل parsing في المتصفح والإدخال النهائي عبر نفس Server Action الحالي. أما WhatsApp فيحتاج بيئة Meta اختبارية منفصلة، allowlist للأرقام، توقيع webhook، idempotency، وfeature flag يمنع أي إرسال حي افتراضيًا. لا نعتبر التكامل جاهزًا للعملاء حتى يظهر دليل على رسالة اختبار وصلت، وWebhook delivery سُجل، ومحاولة recipient خارج allowlist رُفضت.

## References

[1]: https://docs.sheetjs.com/docs/demos/local/file/ "SheetJS — Local File Access"

[2]: https://docs.sheetjs.com/docs/api/parse-options/ "SheetJS — Reading Files and Parsing Options"

[3]: https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started "Meta — WhatsApp Cloud API Get Started"

[4]: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint/ "Meta — Create a Webhook Endpoint"

[5]: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview "Meta — WhatsApp Webhooks Overview"
