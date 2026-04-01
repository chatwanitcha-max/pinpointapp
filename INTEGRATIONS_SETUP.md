# Integrations Setup (Lead + LINE OA + GA4 + Meta)

## 1) Required Environment Variables on Vercel
Set these in Vercel Project Settings > Environment Variables:

- `RESEND_API_KEY` = Resend API key
- `LEAD_FROM_EMAIL` = sender email (e.g. `lead@yourdomain.com`)
- `LEAD_TO_EMAIL` = receiver email for lead notifications

- `LINE_CHANNEL_ACCESS_TOKEN` = LINE Messaging API channel token
- `LINE_TARGET_ID` = target user/group id for push message
- `LINE_OA_WEBHOOK_URL` = optional webhook (Make/Zapier) for LINE forwarding

- `GA4_MEASUREMENT_ID` = e.g. `G-XXXXXXXXXX`
- `GA4_API_SECRET` = GA4 Measurement Protocol API secret
- `GOOGLE_ADS_ID` = e.g. `AW-XXXXXXXXX`
- `GOOGLE_ADS_LEAD_LABEL` = Google Ads conversion label for leads

- `META_PIXEL_ID` = Meta Pixel ID
- `META_ACCESS_TOKEN` = Meta Conversions API access token

## 2) Client-Side Tracking IDs
Tracking IDs now load at runtime from `/api/public-config`, so you do not need to hardcode them into every static page anymore.

Public values exposed to the browser:
- `GA4_MEASUREMENT_ID`
- `GOOGLE_ADS_ID`
- `GOOGLE_ADS_LEAD_LABEL`
- `META_PIXEL_ID`

Private values that stay server-side:
- `GA4_API_SECRET`
- `META_ACCESS_TOKEN`

## 3) Lead Form Data Flow
1. User submits lead form on homepage.
2. Frontend posts to `/api/lead`.
3. Server sends:
- Email notification via Resend
- LINE OA notification (push/webhook)
- GA4 server event (`generate_lead`)
- Meta CAPI event (`Lead`)
4. User redirected to `thank-you.html` and browser tracking fires conversion events.

## 4) Automatic Blog Generation
Update posts in [content/blog-posts.json](d:\PINPOINT\WEBAPP\content\blog-posts.json), then run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\generate-blog.ps1
```

Generated outputs:
- `/blog/index.html`
- `/blog/<slug>/index.html`
- `/sitemap.xml`
