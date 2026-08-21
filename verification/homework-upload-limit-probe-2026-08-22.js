/*
 * MYAcademy QA-only homework upload-limit probe.
 * Run this in DevTools while already authenticated as a Student on
 * https://my-academy-eg.vercel.app.
 *
 * The route is metadata-only: it does not create a signed URL, upload bytes,
 * insert a files row, or change Storage/DB. Expected result: HTTP 413 and
 * rejected=true for 10,485,761 bytes.
 */
(async () => {
  const fileSize = 10_485_761;
  const response = await fetch("/api/qa/homework-upload-limit-probe", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      fileName: "MYAcademy-limit-probe.pdf",
      fileSize,
      contentType: "application/pdf",
    }),
  });

  const body = await response.json().catch(() => null);
  console.log({
    status: response.status,
    body,
    expected: {
      status: 413,
      rejected: true,
      declaredBytes: fileSize,
      maxBytes: 10_485_760,
      mutation: "none",
    },
  });

  return { status: response.status, body };
})();
