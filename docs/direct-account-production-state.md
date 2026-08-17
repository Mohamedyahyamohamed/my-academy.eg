# Direct account production state — 2026-08-17

- Production settings page shows a direct-account form with roles Student, Teacher, Parent.
- The form states: confirmed Auth account directly; no invitation or email is sent.
- Student 1 email `2202893@student.eelu.edu.eg` was verified in `auth.users` with created_at `2026-08-17 16:09:09+00`.
- Owner email `mohamedyahya13579@gmail.com` exists in `auth.users`.
- Old invitation records remain pending for Student 1, Student 2, Teacher, and Parent; these are invitations only and are not proof of Auth account creation.
- The Assistant panel correctly requires at least one group before creation.
- The direct-account form currently defaults to Student and has fields Full name, Email, Role, Password, and Create account.
- Latest browser verification: the direct-account form is visible and explicitly states that creation confirms the Auth account directly with no invitation/email. Existing invitation rows remain Pending and are not proof of direct account creation. Assistant creation remains blocked until at least one group exists.
- Teacher direct account verified in production Supabase Auth: `mohamedworkout687@gmail.com` exists with `confirmed_at` `2026-08-17 16:19:17+00`. Password was not observed or stored by the agent.
- Next step: create/verify Parent direct account, then create a group under Teacher/Owner before provisioning the group-scoped Assistant.

## 2026-08-17 — Group creation timeout fix
- Production deployment: `dpl_FX62HrMN4aYCGPhRU29devuVMp5k`, commit `751ab058c943b6ef06b9c6bae8ad5f1b581e1def`, state READY.
- Local build passed after adding a 15-second timeout around `persistInsert` Supabase upserts; timeout errors now propagate instead of leaving the form indefinitely loading.
- Previous QA group attempt was closed without persistence; read-only Supabase verification found no QA course/group rows.
- Current Production retry form is open with group `MYAcademy QA Group 01`, course `MYAcademy QA Course`, teacher `MYAcademy Test Teacher`; schedule controls remain to be completed before submit.
- Production URL: https://my-academy-eg.vercel.app/groups
- No email/WhatsApp messages were sent and no passwords were logged.

## Production group creation verification — 2026-08-17
- Deployment `dpl_JCN9DbQsbVRkToeQRkPvNMuWxhdk` / commit `322469e` reached READY on Vercel.
- Browser evidence: success toast `تم إنشاء المجموعة.` and visible card `MYAcademy QA Group 01`.
- Course: `MYAcademy QA Course`; teacher: `MYAcademy Test Teacher`; students: 0; schedule: Saturday, 4:00 PM–5:30 PM; monthly fee: 0.
- Fix validated: passing authenticated `academy_id` to `canCreate("groups", academyId)` and using the same scoped ID for the inserted group.
- No email/WhatsApp message was sent.

