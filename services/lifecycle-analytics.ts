import { nodeSupabaseClient } from "@/lib/supabase/node-client";
import { currentAcademyId } from "./session";

export type LifecycleAnalytics = {
  signups: number;
  onboardingCompleted: number;
  invitesCreated: number;
  invitesAccepted: number;
  checkoutsStarted: number;
  paidConversions: number;
  cancellations: number;
  activeSubscriptions: number;
  conversionRate: number;
  inviteAcceptanceRate: number;
  recentEvents: Array<{ action: string; created_at: string; metadata: Record<string, unknown> }>;
};

/**
 * Funnel metrics are tenant-scoped and intentionally use aggregate counts only.
 * Audit logs are queried with a hard limit so an unusually large academy cannot
 * turn the admin dashboard into an unbounded database read.
 */
export async function getLifecycleAnalytics(): Promise<LifecycleAnalytics> {
  const empty: LifecycleAnalytics = {
    signups: 0,
    onboardingCompleted: 0,
    invitesCreated: 0,
    invitesAccepted: 0,
    checkoutsStarted: 0,
    paidConversions: 0,
    cancellations: 0,
    activeSubscriptions: 0,
    conversionRate: 0,
    inviteAcceptanceRate: 0,
    recentEvents: [],
  };

  const academyId = currentAcademyId();
  const client = nodeSupabaseClient();
  if (!academyId || !client) return empty;

  const { data: logs } = await client
    .from("audit_logs")
    .select("action,created_at,metadata")
    .eq("academy_id", academyId)
    .in("action", [
      "academy.create",
      "onboarding.complete",
      "invite.create",
      "invite.accept",
      "billing.checkout_started",
      "student.import",
    ])
    .order("created_at", { ascending: false })
    .limit(500);

  const events = (logs ?? []) as Array<{ action: string; created_at: string; metadata: Record<string, unknown> | null }>;
  const count = (action: string) => events.filter((event) => event.action === action).length;

  const { data: billingEvents } = await client
    .from("billing_events")
    .select("status,processed_at,created_at")
    .eq("academy_id", academyId)
    .eq("status", "processed")
    .limit(500);

  const { data: subscriptions } = await client
    .from("subscriptions")
    .select("status,cancel_at_period_end,canceled_at")
    .eq("academy_id", academyId)
    .limit(10);

  const checkoutsStarted = count("billing.checkout_started");
  const paidConversions = billingEvents?.length ?? 0;
  const invitesCreated = count("invite.create");
  const invitesAccepted = count("invite.accept");
  const subscriptionRows = (subscriptions ?? []) as Array<{ status: string | null; cancel_at_period_end: boolean | null; canceled_at: string | null }>;
  const activeSubscriptions = subscriptionRows.filter((s) => s.status === "active").length;
  const cancellations = subscriptionRows.filter((s) => s.status === "canceled" || s.cancel_at_period_end || s.canceled_at).length;

  return {
    signups: count("academy.create"),
    onboardingCompleted: count("onboarding.complete"),
    invitesCreated,
    invitesAccepted,
    checkoutsStarted,
    paidConversions,
    cancellations,
    activeSubscriptions,
    conversionRate: checkoutsStarted ? Math.round((paidConversions / checkoutsStarted) * 100) : 0,
    inviteAcceptanceRate: invitesCreated ? Math.round((invitesAccepted / invitesCreated) * 100) : 0,
    recentEvents: events.slice(0, 8).map((event) => ({
      action: event.action,
      created_at: event.created_at,
      metadata: event.metadata ?? {},
    })),
  };
}
