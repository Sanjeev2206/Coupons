# Coupons — Supabase setup

This folder contains the first database foundation for Coupons.

## One-time manual setup

1. Create a new Supabase project for Coupons.
2. Open **SQL Editor → New query**.
3. Open **supabase/schema.sql** in this repository.
4. Copy the entire file into the SQL Editor and click **Run**.
5. Confirm that the query completes successfully.

This script is intended for a brand-new project. Do not run it repeatedly on a live production database without a migration plan.

## What the schema creates

- Customer/business profiles tied to Supabase Auth users
- Business profiles with pending/approved/rejected/suspended status
- Public question prompts and options
- A separate private answer-key table (correct answers are not exposed to visitors)
- Answer attempts
- Coupons with unique codes, issue/expiry dates and redemption state
- Server-side functions for business registration, question creation, answer validation, coupon issuance and redemption
- Row Level Security policies and restricted direct writes

## Security and product decisions

- New business registrations remain **pending** until manually approved by a trusted administrator.
- A customer can claim at most one coupon per question.
- Coupon issuance is validated inside PostgreSQL, not in browser JavaScript.
- Coupon redemption is restricted to the owner of the issuing approved business.
- The browser must never receive the Supabase **service_role** secret.
- The schema does not send SMS by itself. OTP/SMS provider configuration is a separate step.

## Still to implement in the application

The existing static homepage is not yet connected to this database. The next code milestone is to add Supabase client configuration using the project URL and publishable/anon key, then build sign-in, customer wallet and business dashboard screens that call the database functions above.

## Important

The current homepage contains sample businesses and sample quiz answers for demonstration. They are not live listings, and the demo quiz must not be treated as real coupon issuance.
