# Platform subscriptions link runtime check

**Date:** 19 August 2026

**Production URL checked:** `https://my-academy-eg.vercel.app/platform?tab=billing`

## Result

The authenticated platform-owner session opened the platform dashboard with the **Subscriptions** tab selected. The sidebar displayed **Academy Management**, **Platform Users**, **Subscriptions**, **Audit Logs**, **Help & Support**, and **Privacy**. The page displayed academy subscription rows and the **Subscription controls** section with **Suspend service** buttons.

## Conclusion

For the `SUPER_ADMIN` / platform-owner test, the correct subscriptions URL is `/platform?tab=billing`. The simplified QA checklist must not instruct the tester to use `/billing` as the Owner subscriptions page. No payment action or subscription mutation was executed during this check.

## `/billing` behavior

Opening `https://my-academy-eg.vercel.app/billing` in the authenticated platform-owner session redirected to `https://my-academy-eg.vercel.app/platform` and selected the overview tab. This is role-guard behavior for `SUPER_ADMIN`, not a missing route. The Owner must use `https://my-academy-eg.vercel.app/platform?tab=billing` to open subscription management.
