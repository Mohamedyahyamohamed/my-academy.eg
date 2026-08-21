// Run only while authenticated as the Academy A Teacher in production.
// Replace the value below with the UUID of the synthetic Academy B Test Group.
const TARGET_ACADEMY_B_GROUP_ID = "PASTE_SYNTHETIC_ACADEMY_B_GROUP_UUID_HERE";
const ENDPOINT = "/api/qa/tenant-isolation-mutation-probe";
const FIXTURE_NAME = "Academy B Test Group";

if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(TARGET_ACADEMY_B_GROUP_ID)) {
  throw new Error("Replace TARGET_ACADEMY_B_GROUP_ID with the synthetic Academy B group UUID before running.");
}

async function runTenantMutationProbe(operation) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operation,
      targetId: TARGET_ACADEMY_B_GROUP_ID,
      fixtureName: FIXTURE_NAME,
    }),
  });
  const body = await response.json().catch(() => ({}));
  return {
    operation,
    status: response.status,
    body,
    expected: { status: 403, denied: true, mutationApplied: false },
  };
}

const results = [];
results.push(await runTenantMutationProbe("update"));
results.push(await runTenantMutationProbe("delete"));
console.table(results);
results;
