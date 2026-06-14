# Akaal Shauoni — API (SLMS-api)

## Deployment

```bash
cd /home/ubuntu/SLMS-api
git pull
npm run build
NODE_ENV=production pm2 restart slms-api --update-env
```

The inline `NODE_ENV=production` is belt-and-suspenders — it forwards to the node process via `--update-env` and (because `dotenv` doesn't overwrite already-set env vars) wins over anything `.env` says. The `.env` file should also have `NODE_ENV=production` on line 1.

If the API regresses to "Origin not allowed" again, first thing to check on the server: `grep -i "^NODE_ENV" /home/ubuntu/SLMS-api/.env`. We've seen `.env` silently revert to `development` more than once.

## Operational notes

### Production server layout
- Runs as the pm2 process `slms-api`, started via `npm run start` (which runs `node dist/index.js`).
- Listens on `localhost:5001`. Nginx (`server_name akaalshaouni.org www.akaalshaouni.org akaal.wspclients.com`) `proxy_pass`es to it.
- Reads config from `/home/ubuntu/SLMS-api/.env` via `dotenv.config()` in `src/config/config.ts`.

### CORS allowlist (flat — no longer `NODE_ENV`-dependent)
`index.ts` now uses a single flat allowlist that contains the akaalshaouni hosts and a handful of localhost dev ports. We removed the original `NODE_ENV === 'development' ? ... : ...` ternary because:

- `dotenv` populates `process.env` after the process starts, so `NODE_ENV` is invisible in `/proc/<pid>/environ` and easy to misdiagnose.
- The production `.env` on the server was twice silently set to `NODE_ENV=development`, which silently swapped the allowlist and broke CORS for `www.akaalshaouni.org` without any other symptom (the apex still "worked" because it was same-origin).

To add a new host, just append to the `origin` array in `index.ts`. Don't reintroduce branching on `NODE_ENV`.

Symptom of an allowlist miss: subdomain fails with "Origin ... is not allowed by Access-Control-Allow-Origin" in the browser console. The OPTIONS preflight returns 200 with `Vary`, `Allow-Methods`, `Allow-Credentials` but no `Access-Control-Allow-Origin`.

### S3 bucket has its OWN CORS, separate from the API
Image uploads use a presigned URL: the client calls the API for a URL, then the browser does a direct `PUT` to `prod-akaalshaouni.s3.ap-southeast-2.amazonaws.com`. That PUT triggers its own CORS preflight against the S3 bucket — completely independent of the express `cors` middleware.

If a new host is added to the API CORS allowlist, it must ALSO be added to the S3 bucket's CORS policy (`AllowedOrigins`) via the AWS console or `aws s3api put-bucket-cors`. Symptom of an S3 CORS miss: the upload toast says "Could not upload photo to storage. S3 upload blocked (network / CORS)..." and the browser console shows `Preflight response is not successful. Status code: 403` against the S3 hostname.

Verify with:
```bash
curl -is -X OPTIONS \
  -H "Origin: https://www.akaalshaouni.org" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: content-type" \
  "https://prod-akaalshaouni.s3.ap-southeast-2.amazonaws.com/" | grep -iE "access-control|HTTP/"
```
Expect `200` and `Access-Control-Allow-Origin: <origin>`.

### Quick CORS diagnostic
```bash
# Live preflight from the failing origin, bypassing nginx
curl -is -X OPTIONS \
  -H "Origin: https://www.akaalshaouni.org" \
  -H "Access-Control-Request-Method: GET" \
  http://127.0.0.1:5001/api/v1/upload-image/presignedUrl | grep -iE "access-control|HTTP/"
```
Expect `access-control-allow-origin: https://www.akaalshaouni.org` in the response when configured correctly. If you ever need to inspect the live allowlist from inside the process, temporarily add `console.log("CORS allowlist:", origin)` after the `const origin =` block, rebuild, restart, and read `pm2 logs slms-api --lines 30 --nostream | grep -A12 "CORS allowlist"` — then remove the log.
