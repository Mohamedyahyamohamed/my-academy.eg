import { APP_CONFIG } from "@/lib/constants";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Privacy Policy</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleDateString("en-GB")}
        </p>
      </div>

      <Section title="1. Data We Collect">
        <p>We collect the following personal data to provide academy management services:</p>
        <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
          <li><strong>Student data:</strong> name, date of birth, gender, phone, email, school, grade, parent/guardian link.</li>
          <li><strong>Parent data:</strong> name, email, phone, occupation.</li>
          <li><strong>Teacher data:</strong> name, email, phone, bio.</li>
          <li><strong>Academic data:</strong> attendance records, exam grades, homework submissions.</li>
          <li><strong>Financial data:</strong> payment records (amounts, dates, methods). We do NOT store credit card numbers.</li>
          <li><strong>Usage data:</strong> audit logs (actions, IP, timestamps) for security.</li>
        </ul>
      </Section>

      <Section title="2. How We Use Your Data">
        <p>Data is used exclusively for:</p>
        <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
          <li>Managing student enrollment, attendance, grades, and payments.</li>
          <li>Communicating with parents about their children's progress.</li>
          <li>Generating reports and analytics for academy administrators.</li>
          <li>Security auditing and fraud prevention.</li>
        </ul>
        <p>We do <strong>not</strong> sell, rent, or share data with third parties.</p>
      </Section>

      <Section title="3. Who Can Access Data">
        <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
          <li><strong>Academy Admin:</strong> full access within their academy.</li>
          <li><strong>Teachers:</strong> access only to students in their assigned groups.</li>
          <li><strong>Parents:</strong> access only to their own children's data.</li>
          <li><strong>Students:</strong> access only to their own data.</li>
        </ul>
        <p>Access is enforced via database-level Row Level Security (RLS).</p>
      </Section>

      <Section title="4. Data Retention">
        <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
          <li><strong>Active students:</strong> data retained while enrolled.</li>
          <li><strong>Archived students:</strong> data retained for <strong>1 academic year</strong> after archiving, then permanently deleted.</li>
          <li><strong>Payments & grades:</strong> never hard-deleted (soft-deleted with timestamp) for financial/academic integrity.</li>
          <li><strong>Audit logs:</strong> retained for 90 days.</li>
        </ul>
      </Section>

      <Section title="5. Data Subject Rights">
        <p>Under Egyptian Law 151 of 2020 and GDPR, users have the right to:</p>
        <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
          <li><strong>Access:</strong> request a copy of their data.</li>
          <li><strong>Correction:</strong> request correction of inaccurate data.</li>
          <li><strong>Export:</strong> download all data as JSON/CSV.</li>
          <li><strong>Erasure:</strong> request deletion (subject to financial record retention).</li>
        </ul>
        <p>To exercise these rights, contact the academy administrator.</p>
      </Section>

      <Section title="6. Minor's Data (Students Under 18)">
        <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
          <li>Student data is collected with <strong>explicit parent/guardian consent</strong>.</li>
          <li>Parents can access, export, or request deletion of their child's data at any time.</li>
          <li>Student accounts are read-only — they cannot modify official grades or attendance.</li>
          <li>Biometric data is <strong>never</strong> collected. QR codes contain only a student ID.</li>
        </ul>
      </Section>

      <Section title="7. Data Security">
        <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
          <li>All data is encrypted in transit (HTTPS/TLS).</li>
          <li>Row Level Security (RLS) on all database tables.</li>
          <li>Rate limiting on authentication and API endpoints.</li>
          <li>Audit logging on all sensitive operations.</li>
          <li>Service role keys are server-only (never exposed to client).</li>
        </ul>
      </Section>

      <Section title="8. Contact">
        <p>For privacy questions or data requests, contact your academy administrator.</p>
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
