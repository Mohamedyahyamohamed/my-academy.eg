export const metadata = { title: "شروط الاستخدام" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">شروط الاستخدام</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          آخر تحديث: {new Date().toLocaleDateString("ar-EG")}
        </p>
      </div>

      <Section title="1. الموافقة على الشروط">
        <p>بإنشاء حساب للأكاديمية، فإنك توافق على هذه الشروط وتتحمل مسؤولية البيانات التي تُدخل إلى النظام.</p>
      </Section>

      <Section title="2. مسؤوليات مالك الأكاديمية">
        <ul className="mr-4 list-disc space-y-1 text-sm text-muted-foreground">
          <li>الحصول على موافقة أولياء الأمور أو الأوصياء قبل إدخال بيانات الطلاب.</li>
          <li>ضمان دقة البيانات واكتمالها.</li>
          <li>إدارة حسابات المستخدمين من المدرّسين وأولياء الأمور والطلاب بمسؤولية.</li>
          <li>الالتزام بقوانين حماية البيانات المطبّقة.</li>
        </ul>
      </Section>

      <Section title="3. خطط الاشتراك">
        <ul className="mr-4 list-disc space-y-1 text-sm text-muted-foreground">
          <li><strong>المجانية:</strong> حتى 30 طالبًا، ومدرّسين، و5 مجموعات.</li>
          <li><strong>الأساسية:</strong> حتى 100 طالب، و10 مدرّسين، و25 مجموعة.</li>
          <li><strong>الاحترافية:</strong> حتى 500 طالب، و25 مدرّسًا، و100 مجموعة.</li>
          <li><strong>المؤسسات:</strong> دون حدود.</li>
        </ul>
        <p>تُطبَّق حدود الاستخدام من جهة الخادم، ويصبح تغيير الخطة ساريًا فورًا.</p>
      </Section>

      <Section title="4. البيانات وإلغاء الاشتراك">
        <ul className="mr-4 list-disc space-y-1 text-sm text-muted-foreground">
          <li>بياناتك ملك لك، ولا نمنعك من الوصول إليها.</li>
          <li>يمكنك تصدير بياناتك في أي وقت.</li>
          <li>عند إلغاء الاشتراك، نحتفظ بالبيانات لمدة <strong>90 يومًا</strong> لإتاحة إعادة التفعيل، ثم تُحذف نهائيًا.</li>
          <li>لا نحذف البيانات فور الإلغاء لتجنّب فقدانها عن طريق الخطأ.</li>
        </ul>
      </Section>

      <Section title="5. الاستخدام المقبول">
        <ul className="mr-4 list-disc space-y-1 text-sm text-muted-foreground">
          <li>لا تستخدم النظام في أي أنشطة غير قانونية.</li>
          <li>لا تحاول الوصول إلى بيانات أكاديميات أخرى.</li>
          <li>لا تشارك بيانات الدخول الخاصة بك.</li>
          <li>لا تُسئ استخدام حدود الطلبات أو تحاول إرهاق النظام.</li>
        </ul>
      </Section>

      <Section title="6. حدود المسؤولية">
        <p>تُقدَّم الخدمة كما هي دون ضمانات. لا نتحمل مسؤولية فقدان البيانات الناتج عن عوامل خارج نطاق سيطرتنا، ونوصي بتصدير البيانات بانتظام.</p>
      </Section>

      <Section title="7. التعديلات">
        <p>قد نحدّث هذه الشروط من وقت لآخر. ويُعد استمرارك في استخدام الخدمة بعد التحديث موافقةً على التعديلات.</p>
      </Section>
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
