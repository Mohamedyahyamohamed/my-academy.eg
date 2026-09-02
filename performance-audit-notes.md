# Performance audit notes

## Authenticated browser check
- My Browser successfully opened `/teacher?perf=1` after the user confirmed login.
- The protected teacher dashboard rendered successfully and showed real-looking tenant-scoped counters and navigation.
- Visible dashboard state included: 13 groups, 82 students, 1 lesson today, 6 upcoming lessons, and attendance displayed as `— / لم تُسجّل حصص بعد` when no sessions were recorded.
- Browser tooling does not expose Chrome DevTools Performance/Lighthouse internals, so exact LCP/FCP/TTFB/network-request/JS-byte metrics cannot be read from the authenticated browser session through the available interface. Navigation/render smoke observations are recorded separately.

## `/api/health` before
- 5 live requests to `https://my-academy-eg.vercel.app/api/health`.
- Status: 200 for all.
- TTFB seconds: 1.069284, 0.703390, 0.829645, 0.794084, 1.027427.
- Total seconds: 1.069338, 0.703453, 0.829706, 0.794142, 1.027487.
- Payload: 258 B each.
- Mean TTFB: 0.884766 s; median: 0.829645 s.

## Local `/api/health` after
- 5 requests after lightweight rewrite.
- Status: 200 for all.
- TTFB seconds: 0.300537, 0.006178, 0.015449, 0.006804, 0.004116.
- Total seconds: 0.300725, 0.006241, 0.015851, 0.007045, 0.004265.
- Payload: 154 B each.
- Mean TTFB: 0.066617 s; median: 0.006804 s.

## Live endpoint status
- Live Vercel endpoint still returned the old 258 B response during this measurement because the new commit had not yet been deployed.
- Deployment must be triggered/confirmed before claiming live after numbers.

## Changes made in working tree
- `/api/health` is now a lightweight liveness endpoint with no DB/Auth/Storage calls and `Cache-Control: no-store`.
- Dependency checks should remain in protected monitoring, not the hot liveness path.
- TypeScript and production build passed after the rewrite.

## Caveat
- Full Lighthouse/Web Vitals numbers for authenticated routes require a Lighthouse/Playwright runtime with access to the authenticated session or a test account credential. The browser connector can navigate the authenticated session but does not expose raw performance entries/network logs.

## Authenticated route smoke observations

The authenticated session successfully rendered `/groups?perf=1`; the page showed the teacher navigation and populated group cards. It also successfully rendered `/attendance?perf=1`; the page showed the group and lesson selectors, the QR scan action, and an empty-state prompt without a visible console error in the browser output. The connector output does not expose timing, request counts, or JavaScript transfer sizes.
