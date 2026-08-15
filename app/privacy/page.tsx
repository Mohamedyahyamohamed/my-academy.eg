import { cookies } from "next/headers";
import { AlertTriangle, Download, ShieldCheck } from "lucide-react";
import { APP_CONFIG } from "@/lib/constants";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";
import { loadCurrentUser } from "@/services/session";

export async function generateMetadata() {
  const lang = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value);
  return { title: lang === "en" ? "Privacy Policy" : "سياسة الخصوصية" };
}

export default async function PrivacyPage() {
  const lang = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value);
  const ar = lang === "ar";
  const user = await loadCurrentUser();
  const canExport = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const t = ar ? {
    title: "سياسة الخصوصية", updated: "آخر تحديث", notice: "هذه السياسة تشرح طريقة تشغيل MY Academy للبيانات. يجب مراجعتها مع مختص قانوني قبل اعتمادها النهائي، خصوصًا فيما يتعلق بقانون حماية البيانات المصري.",
    sections: [
      { title: "١. البيانات التي نجمعها", body: <><p>نجمع البيانات الشخصية التالية لتقديم خدمات إدارة الأكاديمية:</p><ul><li><strong>بيانات الطلاب:</strong> الاسم، تاريخ الميلاد، النوع، الهاتف، البريد، المدرسة، الصف، وارتباط ولي الأمر.</li><li><strong>بيانات أولياء الأمور:</strong> الاسم، البريد، الهاتف والوظيفة.</li><li><strong>بيانات المدرسين:</strong> الاسم، البريد، الهاتف والنبذة التعريفية.</li><li><strong>البيانات الأكاديمية:</strong> الحضور، الدرجات وتسليمات الواجبات.</li><li><strong>البيانات المالية:</strong> مبالغ المدفوعات وتواريخها وطرقها. <strong>لا نخزن</strong> أرقام البطاقات.</li><li><strong>بيانات الاستخدام:</strong> سجلات التدقيق والإجراءات وعناوين IP والتوقيتات لأغراض الأمان.</li></ul></> },
      { title: "٢. كيف نستخدم بياناتك", body: <><p>تستخدم البيانات في إدارة الطلاب والحضور والدرجات والمدفوعات، والتواصل مع أولياء الأمور، وإنشاء التقارير، وتدقيق الأمان ومنع الاحتيال.</p><p>نحن <strong>لا</strong> نبيع أو نؤجر أو نشارك البيانات مع أطراف ثالثة.</p></> },
      { title: "٣. من يمكنه الوصول إلى البيانات", body: <><ul><li><strong>مدير الأكاديمية:</strong> وصول كامل داخل أكاديميته.</li><li><strong>المدرسون:</strong> طلاب مجموعاتهم فقط.</li><li><strong>أولياء الأمور:</strong> بيانات أبنائهم فقط.</li><li><strong>الطلاب:</strong> بياناتهم الشخصية فقط.</li></ul><p>يطبق الوصول عبر Row Level Security على مستوى قاعدة البيانات.</p></> },
      { title: "٤. الاحتفاظ بالبيانات", body: <ul><li>تبقى بيانات الطلاب والأكاديمية متاحة طوال فترة استخدام الخدمة، حتى يطلب المدير الحذف أو الإغلاق.</li><li>تراجع المدفوعات والدرجات قبل أي حذف.</li><li>تحتفظ سجلات الأمان بالحد اللازم للحماية والتحقيق.</li><li>الحذف التلقائي غير مفعل حاليًا.</li></ul> },
      { title: "٥. حقوق صاحب البيانات", body: <><p>وفقًا لقانون حماية البيانات المصري، تشمل الحقوق الوصول والتصحيح والتصدير والحذف، مع مراعاة الالتزامات المالية والتنظيمية.</p><p>لممارسة هذه الحقوق، تواصل مع مدير الأكاديمية أو مركز الدعم. ستراجع الطلبات للتحقق من الهوية ونطاق الأكاديمية.</p></> },
      { title: "٦. بيانات القاصرين", body: <ul><li>تجمع بيانات الطلاب بموافقة ولي الأمر.</li><li>يمكن لولي الأمر طلب الوصول أو التصحيح أو النسخة أو الحذف.</li><li>حسابات الطلاب للقراءة فقط.</li><li>لا تجمع بيانات حيوية؛ رموز QR تحتوي على رقم الطالب فقط.</li></ul> },
      { title: "٧. أمان البيانات", body: <ul><li>تشفير البيانات أثناء النقل عبر HTTPS/TLS.</li><li>تطبيق RLS على جداول قاعدة البيانات.</li><li>تحديد معدل الطلبات على المصادقة وواجهات API.</li><li>تسجيل العمليات الحساسة.</li><li>مفاتيح الخدمة للخادم فقط ولا تكشف للعميل.</li></ul> },
      { title: "٨. التواصل", body: <p>للاستفسارات المتعلقة بالخصوصية أو طلبات البيانات، تواصل مع مدير الأكاديمية أو مركز الدعم داخل التطبيق.</p> },
    ], footer: `${APP_CONFIG.name} — سياسة الخصوصية التشغيلية. للاستفسارات، استخدم مركز الدعم داخل المنصة أو تواصل مع مدير الأكاديمية.`, exportTitle: "تصدير نسخة الأكاديمية", exportText: "نزّل أرشيف JSON مقيدًا بأكاديميتك ويضم البيانات التشغيلية والتعليمية والمالية وبيانات الملفات الوصفية، دون كلمات المرور أو الجلسات أو بطاقات الدفع.", download: "تنزيل نسخة البيانات", warning: "احفظ الملف في موقع معتمد فقط؛ فهو يحتوي على بيانات شخصية وتعليمية حساسة."
  } : {
    title: "Privacy Policy", updated: "Last updated", notice: "This policy explains how MY Academy handles data. It should be reviewed by legal counsel before final adoption, especially with regard to Egypt’s data protection law.",
    sections: [
      { title: "1. Data we collect", body: <><p>We collect the following information to provide academy management services:</p><ul><li><strong>Student data:</strong> name, date of birth, gender, phone, email, school, grade, and parent relationship.</li><li><strong>Parent data:</strong> name, email, phone, and occupation.</li><li><strong>Teacher data:</strong> name, email, phone, and profile summary.</li><li><strong>Academic data:</strong> attendance, grades, and homework submissions.</li><li><strong>Financial data:</strong> payment amounts, dates, and methods. We <strong>do not store</strong> card numbers.</li><li><strong>Usage data:</strong> audit events, actions, IP addresses, and timestamps for security.</li></ul></> },
      { title: "2. How we use your data", body: <><p>Data is used to manage students, attendance, grades, and payments; communicate with parents; create reports; and protect the service against fraud and misuse.</p><p>We <strong>do not</strong> sell, rent, or share data with third parties.</p></> },
      { title: "3. Who can access the data", body: <><ul><li><strong>Academy admins:</strong> full access within their academy.</li><li><strong>Teachers:</strong> only students in their assigned groups.</li><li><strong>Parents:</strong> only their children’s data.</li><li><strong>Students:</strong> only their own personal data.</li></ul><p>Access is enforced with database-level Row Level Security.</p></> },
      { title: "4. Data retention", body: <ul><li>Academy and student data remains available while the service is used, unless deletion or closure is requested.</li><li>Payments and grades are reviewed before deletion.</li><li>Security logs are retained only as needed for protection and investigation.</li><li>Automatic deletion is currently disabled.</li></ul> },
      { title: "5. Data subject rights", body: <><p>Under applicable Egyptian data protection law, users may request access, correction, export, or deletion, subject to financial and regulatory retention requirements.</p><p>Contact the academy admin or in-app support. Requests are reviewed to verify identity and academy scope.</p></> },
      { title: "6. Children’s data", body: <ul><li>Student data is collected with parent consent.</li><li>Parents may request access, correction, a copy, or deletion.</li><li>Student accounts are read-only.</li><li>No sensitive biometric data is collected; QR codes contain only the student number.</li></ul> },
      { title: "7. Data security", body: <ul><li>Data is encrypted in transit using HTTPS/TLS.</li><li>RLS is applied to database tables.</li><li>Rate limits protect authentication and API endpoints.</li><li>Sensitive operations are audited.</li><li>Service keys remain server-side and are never exposed to clients.</li></ul> },
      { title: "8. Contact", body: <p>For privacy questions or data requests, contact the academy admin or in-app support center.</p> },
    ], footer: `${APP_CONFIG.name} — operational privacy policy. For questions, use in-app support or contact the academy admin.`, exportTitle: "Export academy data", exportText: "Download an academy-scoped JSON archive containing operational, educational, financial, and file metadata. It excludes passwords, sessions, payment card data, and internal security logs.", download: "Download data copy", warning: "Store this file only in an approved location; it contains sensitive personal and educational data."
  };

  return <div dir={ar ? "rtl" : "ltr"} className="mx-auto max-w-3xl space-y-6">
    <div><h1 className="text-2xl font-semibold">{t.title}</h1><p className="mt-1 text-sm text-muted-foreground">{t.updated}: {new Date().toLocaleDateString(ar ? "ar-EG" : "en-US")}</p></div>
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><p>{t.notice}</p></div>
    {t.sections.map((section) => <Section key={section.title} title={section.title}>{section.body}</Section>)}
    {canExport && <div className="rounded-xl border border-primary/20 bg-primary/5 p-5"><div className="flex items-start gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><Download className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h2 className="font-semibold">{t.exportTitle}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{t.exportText}</p><a href="/api/export" className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"><Download className="h-4 w-4" /> {t.download}</a><p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> {t.warning}</p></div></div></div>}
    <p className="text-center text-xs text-muted-foreground">{t.footer}</p>
  </div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-2"><h2 className="text-lg font-semibold">{title}</h2><div className="space-y-2 text-sm text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:ps-5 [&_ul]:text-muted-foreground">{children}</div></div>;
}
