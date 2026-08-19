# Platform Subscription Controls — Runtime Evidence

Date: 2026-08-19

Production URL checked: https://my-academy-eg.vercel.app/platform?tab=billing

Deployment commit: eaff66f87649be3f0f5427617f95199c083943e7
Deployment state: READY

## Observed

The Owner session displayed the Subscriptions tab and the Academy subscriptions section. It listed three workspaces with plan, status, renewal date, and provider fields.

The Subscription controls section displayed a `Suspend service` action for each active workspace. The page explained that Stripe subscriptions can be cancelled at the end of the paid period.

The current production fixtures displayed `No provider · No subscription` for the listed workspaces. Therefore the Stripe-specific cancel-at-period-end and undo-cancellation controls did not appear, which is expected when no Stripe subscription is linked. No action was clicked and no production billing or academy state was changed during this verification.

## Expected next test

Use a sandbox-linked Stripe subscription to verify `Cancel at period end`, `Undo cancellation`, webhook state synchronization, and audit-log entries. Use a synthetic or disposable workspace for the suspend/reactivate test; do not suspend the primary Owner academy.
