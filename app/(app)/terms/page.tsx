export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Terms of Service</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleDateString("en-GB")}
        </p>
      </div>

      <Section title="1. Acceptance">
        <p>By creating an academy account, you agree to these terms. You are responsible for all data entered into the system.</p>
      </Section>

      <Section title="2. Academy Owner Responsibilities">
        <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
          <li>Obtain consent from parents/guardians before entering student data.</li>
          <li>Ensure data accuracy and completeness.</li>
          <li>Manage user accounts (teachers, parents, students) responsibly.</li>
          <li>Comply with applicable data protection laws.</li>
        </ul>
      </Section>

      <Section title="3. Subscription Plans">
        <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
          <li><strong>Free:</strong> up to 30 students, 2 teachers, 5 groups.</li>
          <li><strong>Basic:</strong> up to 100 students, 10 teachers, 25 groups.</li>
          <li><strong>Pro:</strong> up to 500 students, 25 teachers, 100 groups.</li>
          <li><strong>Enterprise:</strong> unlimited.</li>
        </ul>
        <p>Usage limits are enforced server-side. Upgrades take effect immediately.</p>
      </Section>

      <Section title="4. Data & Cancellation">
        <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
          <li>Your data belongs to you. We do not lock it in.</li>
          <li>You can export all data at any time.</li>
          <li>If your subscription is canceled, your data is <strong>retained for 90 days</strong> for reactivation, then permanently deleted.</li>
          <li>We do not delete data immediately upon cancellation to prevent accidental loss.</li>
        </ul>
      </Section>

      <Section title="5. Acceptable Use">
        <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
          <li>Do not use the system for illegal activities.</li>
          <li>Do not attempt to access other academies' data.</li>
          <li>Do not share your credentials.</li>
          <li>Do not abuse rate limits or attempt to overload the system.</li>
        </ul>
      </Section>

      <Section title="6. Limitation of Liability">
        <p>The service is provided "as is" without warranties. We are not liable for data loss caused by factors outside our control. We recommend regular data exports.</p>
      </Section>

      <Section title="7. Changes">
        <p>We may update these terms. Continued use after changes constitutes acceptance.</p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="text-sm text-foreground space-y-2">{children}</div>
    </div>
  );
}
