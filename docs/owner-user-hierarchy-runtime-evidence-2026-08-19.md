# Owner User Hierarchy Runtime Evidence — 2026-08-19

## Environment

- Production URL: https://my-academy-eg.vercel.app/platform?tab=users
- Commit: a1975b007f1c58f84349d76ce839cb6f0f7eb82a
- Vercel deployment: dpl_8HJzq9z9dsf4XmxermpzLZ13ZHQh
- Deployment state: READY

## Observed production behavior

The Owner sidebar exposes separate entries for Academy Management and Platform Users. The Platform Users page no longer presents only a flat account list as the primary view.

The primary view is expandable in the following order:

Academy → Academy owner → Teachers → Groups → Assistants and Students.

The production page visibly rendered an academy workspace, its linked academy owner, teacher cards with group/assistant/student counts, expandable groups, and the administrative account-actions section below the hierarchy.

Observed example values in the current Owner session included an academy workspace with one owner, nine teachers, and 123 students; a teacher node with five groups and 27 students; and expandable group nodes showing student and assistant counts. The test was read-only: no suspend, activate, or delete action was executed.

## Expected QA hierarchy

For the MYAcademy QA fixture, the checklist now directs the tester to expand `MYAcademy QA Group 01` and verify the linked assistant `mohamedyahyamohamed15@gmail.com` and students `2202893` and `2202256`. If the fixture appears under a different academy workspace or is missing, the tester should record it as a data-linking defect rather than modifying production data during this UI test.

## Conclusion

The hierarchy feature is deployed and operational. The remaining verification concern is fixture alignment: the Owner session must show the expected QA academy/group relationships for the test accounts. The hierarchy itself is present and expandable in production.
