# Medic Globe VIP Campaign

This is a Cloudflare Pages + Pages Functions + D1 version for the QR sticker campaign.

It includes:

- QR source tracking through `?source=...`
- Lead registration and VIP code generation
- Gift redemption checking and one-time redeem marking
- Confinement centre conversion reporting
- Admin dashboard with source, redeem, conversion, and CSV export views
- Google Analytics tag: `G-KY2HEC6B46`
- WhatsApp Business API send endpoint for automatic VIP code messages
- D1 database schema in `schema.sql`

## Suggested live URLs

- Public campaign page: `https://vip.medicglobe.com.my/?source=tcm_ampang#register`
- Counter redeem page: `https://vip.medicglobe.com.my/#redeem`
- Partner reporting page: `https://vip.medicglobe.com.my/#partner`
- Admin dashboard: `https://vip.medicglobe.com.my/#admin`

## Cloudflare file structure

```text
index.html
style.css
app.js
functions/
  _lib.js
  api/
    admin.js
    conversions.js
    leads.js
    redeem.js
    whatsapp/
      send.js
schema.sql
```

Cloudflare Pages automatically turns files inside `functions/` into backend API routes.

## Cloudflare setup

1. Upload this folder to a GitHub repo.
2. In Cloudflare, create a Pages project and connect the repo.
3. Build settings:
   - Framework preset: `None`
   - Build command: leave blank
   - Build output directory: `/`
4. Create a D1 database named `medic_globe_vip_campaign`.
5. Run `schema.sql` in the D1 Console.
6. Bind D1 to the Pages project:
   - Binding name: `DB`
   - Database: `medic_globe_vip_campaign`
7. Add WhatsApp environment variables in Pages settings.

Do not use Direct Upload for this project because it includes Pages Functions. Deploy through GitHub connection, or use Wrangler CLI after you have the correct Cloudflare project settings.

## D1 schema

Use `schema.sql` in the Cloudflare D1 Console. It creates:

- `leads`
- `conversions`
- `counters`

## WhatsApp Business API setup

Add these as Cloudflare Pages environment variables:

- `WHATSAPP_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_TEMPLATE_NAME`
- `WHATSAPP_LANGUAGE_CODE`

The current endpoint sends an approved template message. The template should have 6 body variables:

1. Name
2. VIP code
3. QR source label
4. Partner list
5. Redeem link
6. Support phone

Without credentials, the server returns dry-run mode so the campaign flow can still be tested without sending real WhatsApp messages.

## API routes

- `POST /api/leads` creates a lead, generates a VIP code, stores it in D1, and sends WhatsApp.
- `POST /api/redeem` checks or confirms gift redemption.
- `POST /api/conversions` records confinement centre follow-up or signing.
- `GET /api/admin` reads dashboard data.
- `POST /api/admin` with `{ "action": "seed" }` adds demo data.
- `POST /api/whatsapp/send` sends a WhatsApp template message directly.
