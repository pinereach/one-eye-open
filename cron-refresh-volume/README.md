# Volume refresh cron Worker

This Worker runs every 4 hours (UTC: 00:00, 04:00, 08:00, …) and calls your Pages app’s `POST /api/admin/refresh-volume` endpoint so the `market_volume` cache stays up to date.

## One-time setup

1. **Create a shared secret** (e.g. a long random string). You’ll use the same value in two places.

2. **Pages project (your main app)**  
   In Cloudflare Dashboard: **Pages** → your project → **Settings** → **Environment variables** (Production and Preview if needed):
   - Name: `CRON_SECRET`  
   - Value: the secret you created  
   - Encrypt if you want (optional).

3. **This Worker**
   - Set the Pages base URL: in `wrangler.toml`, set `PAGES_URL` under `[vars]` to your app URL (e.g. `https://golf-trip-exchange.pages.dev`). Or override in Dashboard: Workers & Pages → this Worker → Settings → Variables.
   - Set the same secret: from the repo root run:
     ```bash
     cd cron-refresh-volume && wrangler secret put CRON_SECRET
     ```
     Paste the same value you used for the Pages `CRON_SECRET`.

## Deploy

From the **repo root**:

```bash
wrangler deploy -c cron-refresh-volume/wrangler.toml
```

Or from inside `cron-refresh-volume`:

```bash
cd cron-refresh-volume && wrangler deploy
```

After deployment, the cron trigger runs every 4 hours. You can confirm in the Dashboard under Workers & Pages → **golf-trip-refresh-volume** → **Triggers**.
