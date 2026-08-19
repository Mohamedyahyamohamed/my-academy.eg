# External upload-limit findings — 2026-08-19

Vercel Functions documentation: https://vercel.com/docs/functions/limitations

Finding: Vercel Functions impose a maximum request/response body payload of 4.5 MB. Next.js `serverActions.bodySizeLimit` can raise the Next.js parser limit, but it cannot override the Vercel platform request limit.

Next.js Server Actions configuration: https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions

Finding: Next.js Server Actions have a configurable body limit, but using a 500MB Server Action upload on Vercel is not a viable production path because the request reaches the Vercel Function first.

Vercel client-upload guidance: https://vercel.com/docs/vercel-blob/server-upload

Finding: Files larger than the Vercel Function payload limit should use a client/direct upload path to storage (for example multipart/client upload), while a server-authorized step creates a tenant-scoped upload token and finalizes metadata.

Implication for MYAcademy: To support a real 500MB product limit on the current Vercel deployment, the code must move file bytes out of Server Actions and use direct/resumable upload to storage. Raising only `bodySizeLimit` would create a false-success product claim.
