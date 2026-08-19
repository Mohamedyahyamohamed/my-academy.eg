# Owner student-profile runtime evidence — 2026-08-19

## Source
Production URL: https://my-academy-eg.vercel.app/platform?tab=users
Deployment commit: f49ae5a33300252e8f83bcfa87506d99a40a133f
Deployment ID: dpl_GfbqtvmwgTPp7Rx1FLBbLsrJwXru
Vercel state: READY, target production

## Observed behavior
The Platform Users page opens as the platform owner and displays the hierarchy:

Academy / teacher workspace -> academy owner -> teacher -> group -> assistants and students.

The page displayed the teacher workspace `أحمد حسن — مساحة المدرس` with `9 teachers` and `123 students`. The owner node showed `ahmed.hassan.teacher.demo@gmail.com` as `Academy owner`. The teacher node showed `5 groups`, `0 assistants`, and `27 students`.

After expanding the group `QR Demo - Active Now`, the page displayed the sections `Assistants` and `Students`, including the student `سارة تجريبية`, email `sara.qr.demo@example.com`, status `ACTIVE`. Student rows are rendered as links to the student profile route.

## Expected test path
1. Sign in with the platform Owner account.
2. Open `Platform Users`.
3. Expand the academy/teacher workspace.
4. Expand the academy owner and teacher.
5. Expand a group.
6. Click the student row to open the student profile.

## Safety observation
No delete, suspend, edit, or other data-changing action was executed during this verification. The platform-owner student read path is intended to remain scoped to the selected `academy_id`, preserving Academy A versus Academy B isolation.

## Notes
The current production session showed demo/QA data such as `QR Demo - Active Now`; if a specific QA student is absent, that is a data-fixture/linking issue rather than evidence that the hierarchy or profile route is missing.

## Latest verification

After the latest production deployment, expanding `QR Demo - Active Now` exposed the student row as a clickable link element for `سارة تجريبية — sara.qr.demo@example.com · ACTIVE`. This confirms the row is not plain text and can navigate to the student profile route. No mutating action was executed.
