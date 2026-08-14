
## ملاحظة ترقية Next.js

أفاد إعلان Next.js الرسمي الصادر في يوليو 2026 بأن إصدارات الإصلاح المتاحة هي 16.2.11 لخط Active LTS و15.5.21 لخط Maintenance LTS، بينما يظل خط 14 خارج خطوط الإصلاح الحالية. المصدر: [Next.js July 2026 Security Release](https://nextjs.org/blog/july-2026-security-release).

نتيجة `npm audit --omit=dev` للمشروع الحالي صنفت Next.js كاعتمادية مباشرة بدرجة High، ولم تقترح إصلاحًا غير رئيسي؛ الإصلاح المتاح في شجرة npm هو Next.js 16.3.1. يتطلب `eslint-config-next@16.3.1` إصدار ESLint 9 أو أحدث، لذلك فشل تحديث lockfile عند بقاء `eslint@^8`، ولم يُستخدم `--force` أو `--legacy-peer-deps`.
