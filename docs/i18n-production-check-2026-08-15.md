# Production i18n check — 2026-08-15

The production homepage at https://my-academy-eg.vercel.app was observed in Arabic first and then English after changing the language. The English state showed translated navigation labels, hero copy, feature sections, role descriptions, pricing CTA, FAQ labels, and `Switch to Arabic`; the Arabic state showed the corresponding Arabic content and `التبديل إلى الإنجليزية`.

This confirms the root cookie/localStorage language flow works on the public homepage. The user's report that not all pages switch therefore requires an application-wide audit of protected pages and shared components, especially labels passed into components without the current language and persisted-value formatters such as payment methods and role/status badges.
