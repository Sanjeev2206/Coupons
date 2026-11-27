# Coupons

**Answer. Unlock. Enjoy.**

Coupons is a question-based customer rewards platform connecting local businesses with customers. Businesses publish simple questions and offer discounts; customers answer correctly to unlock coupons.

## Current milestone: Frontend foundation

The current version is a responsive, static frontend prototype built with HTML, CSS and vanilla JavaScript.

### Included
- Homepage and responsive mobile layout
- All-business discovery and nearby-business view
- Category filters and business search
- Sample business offer cards
- Interactive sample questions and answer feedback
- Business/customer entry points (informational placeholders)

### Demo limitations
- Business names, distances, ratings and offers are sample data.
- No real user accounts, mobile OTP, database, SMS, coupon issuance or redemption is connected yet.
- The nearby section is a visual/demo view; it does not currently use device location.

## Run locally

Open `index.html` in a browser, or use a local static server.

## Deploy with GitHub Pages

1. Open repository **Settings → Pages**.
2. Choose **Deploy from a branch**.
3. Select branch **main** and folder **/ (root)**.
4. Save and wait for the deployment URL.

## Planned roadmap

1. Supabase project, schema and secure access policies
2. Business registration and business dashboard
3. Customer mobile registration and OTP verification
4. Question publishing, answer validation and coupon issuance
5. Unique coupon codes / QR codes and redemption workflow
6. SMS delivery, abuse prevention, testing and launch

## Suggested initial stack

- Frontend: HTML/CSS/JavaScript prototype (can migrate to Vue)
- Database and backend: Supabase
- Hosting: GitHub Pages, Cloudflare Pages or Vercel
- OTP/SMS: a compliant SMS provider (may incur charges)
