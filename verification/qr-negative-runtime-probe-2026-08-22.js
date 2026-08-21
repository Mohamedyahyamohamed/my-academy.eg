/*
 * MYAcademy QR negative runtime probe
 * Run only while authenticated as the Teacher in Academy A.
 * Use synthetic fixture IDs only. Do not paste passwords, cookies, CRON_SECRET,
 * service-role keys, or real student IDs into this script.
 *
 * The script exercises the staff quick-check-in endpoint directly:
 *   1) Academy B group target -> must be denied before any write.
 *   2) Academy A group + unlinked synthetic student -> must be denied.
 *   3) Academy A group + enrolled synthetic student twice -> first may be 200,
 *      second must be 409 ATTENDANCE_ALREADY_RECORDED. If it was already used,
 *      both calls may be 409; inspect the final record count instead.
 *
 * Offline/recovery is intentionally a UI test, not a fake fetch result:
 * disable the browser network, scan once, restore the network, click
 * "Retry last scan", and confirm exactly one attendance row exists.
 */

(async () => {
  const api = "/api/checkin/teacher";
  const academyBGroupId = prompt("Synthetic Academy B group UUID (wrong-group case):")?.trim();
  const academyAGroupId = prompt("Synthetic Academy A assigned group UUID:")?.trim();
  const unlinkedStudentId = prompt("Synthetic student UUID NOT enrolled in Academy A group:")?.trim();
  const enrolledStudentId = prompt("Synthetic student UUID enrolled in Academy A group:")?.trim();

  if (!academyBGroupId || !academyAGroupId || !unlinkedStudentId || !enrolledStudentId) {
    throw new Error("All four synthetic UUIDs are required; no request was sent.");
  }

  async function post(label, body) {
    const response = await fetch(api, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    let payload = null;
    try { payload = await response.json(); } catch {}
    const result = { label, status: response.status, payload };
    console.log(result);
    return result;
  }

  const wrongGroup = await post("wrong-group / Academy A teacher -> Academy B group", {
    groupId: academyBGroupId,
    studentId: enrolledStudentId,
  });

  const unlinkedStudent = await post("unlinked student / Academy A group", {
    groupId: academyAGroupId,
    studentId: unlinkedStudentId,
  });

  const firstCheckin = await post("duplicate setup / first enrolled scan", {
    groupId: academyAGroupId,
    studentId: enrolledStudentId,
  });

  const duplicateCheckin = await post("duplicate scan / same lesson + same student", {
    groupId: academyAGroupId,
    studentId: enrolledStudentId,
  });

  const summary = {
    wrongGroupDenied: [403, 404].includes(wrongGroup.status) && wrongGroup.payload?.ok === false,
    unlinkedStudentDenied: [403, 404].includes(unlinkedStudent.status) && unlinkedStudent.payload?.ok === false,
    duplicateDenied: duplicateCheckin.status === 409 && duplicateCheckin.payload?.error === "ATTENDANCE_ALREADY_RECORDED",
    expected: {
      wrongGroup: "403 or 404; no Academy A/B mutation",
      unlinkedStudent: "403 or 404; no attendance row",
      duplicate: "409 ATTENDANCE_ALREADY_RECORDED; exactly one row if first call was 200",
      offlineRecovery: "manual UI test required; retry once after reconnect and verify one row",
    },
  };
  console.table(summary);
  console.log({ firstCheckin, summary });
})();
