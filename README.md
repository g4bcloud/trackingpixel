# trackingpixel

Cloudflare Worker tracking pixel that logs visitor data to R2 bucket.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create R2 bucket:
```bash
wrangler r2 bucket create tracking-pixel
```

3. Set your Cloudflare API token as a secret:
```bash
wrangler secret put CLOUDFLARE_TOKEN
```

4. Deploy:
```bash
npm run deploy
```

## Usage

Embed in HTML/emails:
```html
<!-- Basic tracking -->
<img src="https://your-worker.your-subdomain.workers.dev/?id=blog-post-1" width="1" height="1" style="display:none;">

<!-- Email tracking -->
<img src="https://your-worker.your-subdomain.workers.dev/?id=newsletter-jan&email=user@example.com" width="1" height="1" style="display:none;">
```

## Data Format

Logs are stored as CSV files in R2:
- Filename: `YYYY-MM.csv` (e.g., `2024-01.csv`)
- Columns: `timestamp,ip_address,user_agent,id,email,asn`