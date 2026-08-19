# Owner Student Profile Runtime Check

Date: 2026-08-19

## Production URL tested

`https://my-academy-eg.vercel.app/platform?tab=users`

## Action

SUPER_ADMIN opened the hierarchy, expanded `Demo Group 07 - Morning`, and clicked the student row `عمر تجريبي / omar.qr.demo@example.com`.

## Result

PASS after deployment. The browser navigated to:

`https://my-academy-eg.vercel.app/students/173412c0-910c-467f-985c-eedd9686da13`

The student profile rendered successfully and showed the student header, status, groups, parental-consent status, consent-link form, attendance, grades, payments, and tabs. No `A server error occurred` page appeared.

## Previous failure

The user-reported failure showed `A server error occurred` with error code `3926184533` when opening Student 1. The deployed fix changed the SUPER_ADMIN student-detail path to use the explicit academy context instead of relying on the current academy context.

## Scope note

This runtime check proves the repaired route for a production hierarchy student. The exact user test account `2202893@student.eelu.edu.eg` was not present in the currently rendered hierarchy data during this browser session, so that specific row still requires a separate click test if it is seeded into the hierarchy.

## Safety

No production data was modified and no messages or payments were sent.
