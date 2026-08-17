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


## Production Assistant scope regression — 2026-08-18
- Production deployment `dpl_HNTjvncALF9by9VhT3kYyyacZQuf` for commit `b5b45be` (`fix: use scoped groups for assistant provisioning`) reached READY on Vercel.
- The Assistant form now displays `MYAcademy QA Group 01` and no longer shows the prior outside-academy error after the fix.
- After reload, the Assistant name was re-entered as `MYAcademy Test Assistant`; email and password require re-entry. Password must be entered privately by the user and is not logged or stored.
- No Assistant account was created during the prior rejected attempt.

## Final six-account verification — 2026-08-18
تم فحص `auth.users` مع `profiles` و`academy_memberships` قراءةً فقط. الحسابات الستة كلها موجودة، مؤكدة، وعضويتها ACTIVE داخل الأكاديمية نفسها `d8ed9fbe-890f-43c3-ab60-b6ad3565686a`. الأدوار الفعلية هي: Owner = ADMIN، Student 1 وStudent 2 = STUDENT، Teacher = TEACHER، Parent = PARENT، Assistant = TEACHER مع ربطه بمجموعة QA فقط. لم تُقرأ كلمات المرور أو تُحفظ، ولم تُجر أي تغييرات على البيانات.
