# Coupons

**Answer. Unlock. Enjoy.**

Coupons connects businesses and customers through simple sponsored questions and discount coupons.

## Current implementation

- Responsive discovery homepage with category filters and a nearby-business presentation
- Supabase JS client connected using the project's public publishable key
- Email/password customer account creation and sign-in
- Business-owner account flow with business application submission through the `register_business` database function
- Business applications are pending until approved by a trusted administrator
- Existing sample cards and quizzes are demonstration content only; live offer discovery and coupon claims are not yet wired to the UI

## Supabase configuration

The browser client uses the Supabase project URL and **publishable** key in `script.js`. A publishable key is designed for browser use when Row Level Security is enabled. Never place a Supabase secret/service-role key or database password in frontend code or GitHub.

The database schema is in `supabase/schema.sql`. It creates profiles, businesses, questions, private answer keys, answer attempts and coupons, along with RLS policies and database functions.

### Required Supabase Auth URL settings

In Supabase, open **Authentication → URL Configuration** and set:

- Site URL: `https://sanjeev2206.github.io/Coupons/`
- Add this redirect URL: `https://sanjeev2206.github.io/Coupons/**`

Email confirmation settings determine whether a new user must verify their email before a session is created.

## Test the account flow

1. Open `https://sanjeev2206.github.io/Coupons/` after GitHub Pages finishes deploying.
2. Click **Sign in** and choose **Create an account**.
3. Create a customer account using an email address you control.
4. If email confirmation is enabled, confirm the email and return to sign in.
5. For a business application, choose **For businesses**, create/sign into a business-owner account, and complete the business details. The application should be pending until approved.

## Not yet implemented

- Mobile number OTP and SMS delivery (requires an SMS provider and Supabase Auth configuration)
- Live business/question discovery from Supabase
- Server-validated live question-answer UI and customer coupon wallet
- Business question management dashboard
- Coupon QR display and redemption UI
- Admin approval dashboard and admin role provisioning
- Production testing and abuse/rate-limit controls

Do not treat the static demo questions or sample business cards as real offers or issued coupons.
