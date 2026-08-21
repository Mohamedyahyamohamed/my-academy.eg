
## Reverse cross-tenant runtime denial — 2026-08-21

While authenticated as the Academy A teacher `mohamedworkout687@gmail.com`, opening the Academy B content-file endpoint for file ID `395a8e30-44e8-437f-aa9c-2292acdfaf8c` returned `{"error":"File not found"}`. The supplied screenshot confirms no PDF content, storage path, signed URL, or metadata was exposed. Result: **A → B DENIED**.

## Production smoke and unauthenticated denial — 2026-08-21

The deployed production endpoint returned `/api/health` HTTP 200 with `app=ok`, `qr=ok`, `db=ok`, and measured latency 176 ms. `/status` returned HTTP 200 and rendered Arabic RTL markup. Unauthenticated requests to both the Academy A file endpoint `27817aa4-3051-4ed7-8201-976f9b418a4e` and the Academy B file endpoint `395a8e30-44e8-437f-aa9c-2292acdfaf8c` returned HTTP 401 with `{"error":"Unauthorized"}` and no binary body.
