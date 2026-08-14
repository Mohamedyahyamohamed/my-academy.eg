import { AlertTriangle, Download, ShieldCheck } from "lucide-react";
import { APP_CONFIG } from "@/lib/constants";
import { getCurrentUser } from "@/services";

export const metadata = { title: "سياسة الخصوصية" };

export default function PrivacyPage() {
  const user = getCurrentUser();
  const canExport = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  return (
    <div dir="rtl" className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">سياسة الخصوصية</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          آخر تحديث: {new Date().toLocaleDateString("ar-EG")}
        </p>
      </div>

      {/* تنبيه قانوني */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          هذه السياسة تشرح طريقة تشغيل MY Academy للبيانات. يجب على مالك الخدمة مراجعتها مع مختص قانوني قبل اعتمادها النهائي، خصوصًا فيما يتعلق بقانون حماية البيانات المصري ولائحته التنفيذية.
        </p>
      </div>

      <Section title="١. البيانات التي نجمعها">
        <p>نجمع البيانات الشخصية التالية لتقديم خدمات إدارة الأكاديمية:</p>
        <ul className="list-disc space-y-1 pr-5 text-sm text-muted-foreground">
          <li><strong>بيانات الطلاب:</strong> الاسم، تاريخ الميلاد، النوع، رقم الهاتف، البريد الإلكتروني، المدرسة، الصف الدراسي، وارتباط بولي الأمر.</li>
          <li><strong>بيانات أولياء الأمور:</strong> الاسم، البريد الإلكتروني، رقم الهاتف، الوظيفة.</li>
          <li><strong>بيانات المدرّسين:</strong> الاسم، البريد الإلكتروني، رقم الهاتف، نبذة تعريفية.</li>
          <li><strong>البيانات الأكاديمية:</strong> سجلات الحضور، درجات الامتحانات، تسليمات الواجبات.</li>
          <li><strong>البيانات المالية:</strong> سجلات المدفوعات (المبالغ، التواريخ، طرق الدفع). <strong>لا نخزّن</strong> أرقام بطاقات الائتمان.</li>
          <li><strong>بيانات الاستخدام:</strong> سجلات التدقيق (الإجراءات، عنوان IP، التوقيتات) لأغراض الأمان.</li>
        </ul>
      </Section>

      <Section title="٢. كيف نستخدم بياناتك">
        <p>تُستخدم البيانات حصريًا في:</p>
        <ul className="list-disc space-y-1 pr-5 text-sm text-muted-foreground">
          <li>إدارة تسجيل الطلاب والحضور والدرجات والمدفوعات.</li>
          <li>التواصل مع أولياء الأمور بشأن تقدّم أبنائهم.</li>
          <li>إنشاء التقارير والتحليلات لمديري الأكاديمية.</li>
          <li>تدقيق الأمان ومنع الاحتيال.</li>
        </ul>
        <p>نحن <strong>لا</strong> نبيع أو نؤجّر أو نشارك البيانات مع أطراف ثالثة.</p>
      </Section>

      <Section title="٣. من يمكنه الوصول إلى البيانات">
        <ul className="list-disc space-y-1 pr-5 text-sm text-muted-foreground">
          <li><strong>مدير الأكاديمية:</strong> وصول كامل ضمن نطاق أكاديميته.</li>
          <li><strong>المدرّسون:</strong> وصول لطلاب مجموعاتهم المخصصة فقط.</li>
          <li><strong>أولياء الأمور:</strong> وصول لبيانات أبنائهم فقط.</li>
          <li><strong>الطلاب:</strong> وصول لبياناتهم الشخصية فقط.</li>
        </ul>
        <p>يُطبَّق الوصول عبر نظام أمان على مستوى قاعدة البيانات (Row Level Security).</p>
      </Section>

      <Section title="٤. الاحتفاظ بالبيانات">
        <ul className="list-disc space-y-1 pr-5 text-sm text-muted-foreground">
          <li><strong>الطلاب النشطون والمؤرشفون:</strong> تظل البيانات متاحة للأكاديمية طوال فترة استخدامها للخدمة، إلى أن يطلب المدير إجراء حذف أو إغلاق الحساب.</li>
          <li><strong>المدفوعات والدرجات:</strong> تُراجع قبل أي حذف لأن الاحتفاظ بها قد يكون مطلوبًا للأغراض المالية والأكاديمية.</li>
          <li><strong>سجلات الأمان:</strong> لا تدخل في ملف التصدير العادي، ويجري الاحتفاظ بها بالحد اللازم للحماية والتحقيق في إساءة الاستخدام.</li>
          <li><strong>الحذف التلقائي:</strong> غير مفعل حاليًا؛ أي طلب حذف أو إغلاق يخضع لمراجعة نطاق البيانات والالتزامات التنظيمية قبل التنفيذ.</li>
        </ul>
      </Section>

      <Section title="٥. حقوق صاحب البيانات">
        <p>وفقًا لقانون حماية البيانات المصري رقم 151 لسنة 2020 ولائحته، يتمتع المستخدمون بالحقوق التالية:</p>
        <ul className="list-disc space-y-1 pr-5 text-sm text-muted-foreground">
          <li><strong>الوصول:</strong> طلب نسخة من بياناتهم.</li>
          <li><strong>التصحيح:</strong> طلب تصحيح البيانات غير الدقيقة.</li>
          <li><strong>التصدير:</strong> تنزيل أرشيف الأكاديمية بصيغة JSON؛ يمكن فتحه أو تحويل الجداول المطلوبة منه للاستخدام في أدوات البيانات.</li>
          <li><strong>الحذف:</strong> طلب الحذف (مع مراعاة الاحتفاظ بالسجلات المالية).</li>
        </ul>
        <p>لممارسة هذه الحقوق، تواصل مع مدير الأكاديمية أو مركز الدعم داخل التطبيق. ستُراجع الطلبات للتحقق من الهوية ونطاق الأكاديمية قبل التنفيذ.</p>
      </Section>

      {canExport && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary"><Download className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">تصدير نسخة الأكاديمية</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">نزّل أرشيف JSON مقيدًا بأكاديميتك يضم البيانات التشغيلية والتعليمية والمالية وبيانات الملفات الوصفية. لا يشمل كلمات المرور أو الجلسات أو بيانات بطاقات الدفع أو السجلات الأمنية الداخلية.</p>
              <a href="/api/export" className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
                <Download className="h-4 w-4" /> تنزيل نسخة البيانات
              </a>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> احفظ الملف في موقع معتمد فقط؛ فهو يحتوي على بيانات شخصية وتعليمية حساسة.</p>
            </div>
          </div>
        </div>
      )}

      <Section title="٦. بيانات القاصرين (الطلاب دون 18 عامًا)">
        <ul className="list-disc space-y-1 pr-5 text-sm text-muted-foreground">
          <li>تُجمع بيانات الطلاب بموافقة صريحة من <strong>ولي الأمر</strong>.</li>
          <li>يمكن لأولياء الأمور الوصول إلى بيانات أبنائهم وطلب تصحيحها أو الحصول على نسخة منها أو طلب حذفها عبر مدير الأكاديمية أو الدعم.</li>
          <li>حسابات الطلاب للقراءة فقط — لا يمكنهم تعديل الدرجات أو الحضور الرسمية.</li>
          <li>لا تُجمع <strong>أي بيانات حيوية</strong>. رموز QR تحتوي على رقم الطالب فقط.</li>
        </ul>
      </Section>

      <Section title="٧. أمان البيانات">
        <ul className="list-disc space-y-1 pr-5 text-sm text-muted-foreground">
          <li>تُشفّر جميع البيانات أثناء النقل (HTTPS/TLS).</li>
          <li>نظام أمان على مستوى الصفوف (RLS) في جميع جداول قاعدة البيانات.</li>
          <li>تحديد لمعدل الطلبات على نقاط المصادقة وواجهات API.</li>
          <li>تسجيل تدقيق لجميع العمليات الحساسة.</li>
          <li>مفاتيح الخدمة مخصّصة للخادم فقط ولا تُكشف للعميل أبدًا.</li>
        </ul>
      </Section>

      <Section title="٨. التواصل">
        <p>لأي استفسارات متعلقة بالخصوصية أو طلبات البيانات، يُرجى التواصل مع مدير الأكاديمية أو مركز الدعم داخل التطبيق.</p>
      </Section>

      <p className="text-center text-xs text-muted-foreground">
        {APP_CONFIG.name} — سياسة الخصوصية التشغيلية. للاستفسارات، استخدم مركز الدعم داخل المنصة أو تواصل مع مدير الأكاديمية.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-2 text-sm text-foreground">{children}</div>
    </div>
  );
}
