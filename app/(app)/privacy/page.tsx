import { AlertTriangle } from "lucide-react";
import { APP_CONFIG } from "@/lib/constants";

export const metadata = { title: "سياسة الخصوصية" };

export default function PrivacyPage() {
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
          هذه السياسة مسودة أولية لأغراض العرض، ويجب مراجعتها مع مختص قانوني قبل اعتمادها
          كنص نهائي — خصوصًا فيما يتعلق بقانون حماية البيانات المصري ولائحته التنفيذية.
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
          <li><strong>الطلاب النشطون:</strong> تُحفظ بياناتهم أثناء فترة التسجيل.</li>
          <li><strong>الطلاب المؤرشفون:</strong> تُحفظ بياناتهم لمدة <strong>عام دراسي واحد</strong> بعد الأرشفة، ثم تُحذف نهائيًا.</li>
          <li><strong>المدفوعات والدرجات:</strong> لا تُحذف نهائيًا (حذف ناعم مع ختم زمني) للحفاظ على السلامة المالية والأكاديمية.</li>
          <li><strong>سجلات التدقيق:</strong> تُحفظ لمدة 90 يومًا.</li>
        </ul>
      </Section>

      <Section title="٥. حقوق صاحب البيانات">
        <p>وفقًا لقانون حماية البيانات المصري رقم 151 لسنة 2020 ولائحته، يتمتع المستخدمون بالحقوق التالية:</p>
        <ul className="list-disc space-y-1 pr-5 text-sm text-muted-foreground">
          <li><strong>الوصول:</strong> طلب نسخة من بياناتهم.</li>
          <li><strong>التصحيح:</strong> طلب تصحيح البيانات غير الدقيقة.</li>
          <li><strong>التصدير:</strong> تنزيل جميع البيانات بصيغة JSON/CSV.</li>
          <li><strong>الحذف:</strong> طلب الحذف (مع مراعاة الاحتفاظ بالسجلات المالية).</li>
        </ul>
        <p>لممارسة هذه الحقوق، يُرجى التواصل مع مدير الأكاديمية.</p>
      </Section>

      <Section title="٦. بيانات القاصرين (الطلاب دون 18 عامًا)">
        <ul className="list-disc space-y-1 pr-5 text-sm text-muted-foreground">
          <li>تُجمع بيانات الطلاب بموافقة صريحة من <strong>ولي الأمر</strong>.</li>
          <li>يمكن لأولياء الأمور الوصول إلى بيانات أبنائهم أو تصديرها أو طلب حذفها في أي وقت.</li>
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
        <p>لأي استفسارات متعلقة بالخصوصية أو طلبات البيانات، يُرجى التواصل مع مدير الأكاديمية.</p>
      </Section>

      <p className="text-center text-xs text-muted-foreground">
        {APP_CONFIG.name} — سياسة الخصوصية (نسخة تجريبية، قابلة للمراجعة).
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
