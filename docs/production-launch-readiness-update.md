# MYAcademy — Production Launch Readiness Update

## User-reported production evidence
- Health endpoint: app + qr + db = ok.
- Login succeeded for all six test accounts.
- `/api/search`: unauthenticated = 401; authenticated = 200; no missing authenticated academy context.
- Role boundaries observed: SUPER_ADMIN full access; TEACHER groups/students/attendance/homework/grades without payments/settings; PARENT dashboard/messages/notifications; STUDENT dashboard and `/student`.
- Still untested interactively: cross-tenant A-vs-B isolation, QR on a real phone, file upload, full language switching, and 12-hour time behavior.

## Read-only configuration checks
- Vercel project identity verified: `my-academy-eg`, project `prj_OAJ78KzRhDjdNah4p3TMbLvPQsKH`, team `team_3uWRmEgCHKoT6EFH5K1bUfD1`; latest production deployment was READY.
- Supabase project `fpcdaiyktnoiwaulbhcn` has both an active legacy anon key and an active modern publishable key. The actual Vercel environment value was not exposed or independently verified; manual confirmation is still required that `NEXT_PUBLIC_SUPABASE_ANON_KEY` contains the modern publishable key and that no secret/service-role key is client-exposed.
- Supabase Security Advisor still reports `auth_leaked_password_protection`: Leaked password protection is currently disabled. Remediation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Assistant role finding
The current implementation intentionally provisions Assistant as `TEACHER` in Auth/profile/membership and limits access by selected groups. It is a scoped teacher-assistant model, not a separate database role.
