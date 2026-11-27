-- Coupons platform: initial secure database schema
-- Run this entire file in Supabase SQL Editor for a NEW project.
-- Never expose the service_role key in browser code.

create extension if not exists pgcrypto with schema extensions;

create type public.account_role as enum ('customer','business','admin');
create type public.business_status as enum ('pending','approved','rejected','suspended');
create type public.question_status as enum ('draft','published','paused','ended');
create type public.coupon_status as enum ('active','redeemed','expired','cancelled');
create type public.discount_type as enum ('percentage','fixed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role public.account_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  name text not null check (length(trim(name)) between 2 and 120),
  category text not null,
  description text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  postal_code text,
  latitude double precision,
  longitude double precision,
  status public.business_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_latitude_range check (latitude is null or latitude between -90 and 90),
  constraint business_longitude_range check (longitude is null or longitude between -180 and 180)
);
create index businesses_owner_idx on public.businesses(owner_id);
create index businesses_discovery_idx on public.businesses(status, city, category);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  prompt text not null check (length(trim(prompt)) between 5 and 500),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  reward_type public.discount_type not null,
  reward_value numeric(10,2) not null check (reward_value > 0),
  minimum_purchase numeric(10,2) not null default 0 check (minimum_purchase >= 0),
  max_coupons integer not null default 100 check (max_coupons between 1 and 100000),
  issued_count integer not null default 0 check (issued_count >= 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  coupon_validity_days integer not null default 7 check (coupon_validity_days between 1 and 365),
  terms text,
  status public.question_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_dates_valid check (ends_at > starts_at),
  constraint question_percentage_valid check (reward_type <> 'percentage' or reward_value <= 100)
);
create index questions_discovery_idx on public.questions(status, starts_at, ends_at);
create index questions_business_idx on public.questions(business_id);

-- Correct answers are isolated from publicly readable question prompts/options.
create table public.question_answer_keys (
  question_id uuid primary key references public.questions(id) on delete cascade,
  correct_answer text not null,
  updated_at timestamptz not null default now()
);

create table public.answer_attempts (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  is_correct boolean not null,
  attempted_at timestamptz not null default now()
);
create index answer_attempts_customer_question_idx on public.answer_attempts(customer_id, question_id);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_id uuid not null references auth.users(id) on delete restrict,
  business_id uuid not null references public.businesses(id) on delete restrict,
  question_id uuid not null references public.questions(id) on delete restrict,
  reward_type public.discount_type not null,
  reward_value numeric(10,2) not null check (reward_value > 0),
  minimum_purchase numeric(10,2) not null default 0 check (minimum_purchase >= 0),
  issued_at timestamptz not null default now(),
  valid_until timestamptz not null,
  status public.coupon_status not null default 'active',
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users(id),
  constraint one_coupon_per_customer_question unique(customer_id, question_id),
  constraint coupon_expiry_after_issue check (valid_until > issued_at)
);
create index coupons_customer_idx on public.coupons(customer_id, status, valid_until);
create index coupons_business_idx on public.coupons(business_id, status);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name',''), new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.update_my_profile(p_full_name text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.profiles set full_name=nullif(trim(p_full_name),''),updated_at=now()
  where id=auth.uid();
end;
$$;

create or replace function public.register_business(
  p_name text,p_category text,p_description text default null,p_phone text default null,
  p_email text default null,p_address text default null,p_city text default null,
  p_state text default null,p_postal_code text default null,
  p_latitude double precision default null,p_longitude double precision default null
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare new_business_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if length(trim(coalesce(p_name,''))) < 2 then raise exception 'Enter a valid business name'; end if;
  if length(trim(coalesce(p_category,''))) < 2 then raise exception 'Choose a business category'; end if;
  insert into public.businesses(owner_id,name,category,description,phone,email,address,city,state,postal_code,latitude,longitude)
  values(auth.uid(),trim(p_name),trim(p_category),p_description,p_phone,p_email,p_address,p_city,p_state,p_postal_code,p_latitude,p_longitude)
  returning id into new_business_id;
  update public.profiles set role='business',updated_at=now() where id=auth.uid();
  return new_business_id;
end;
$$;

create or replace function public.create_question(
  p_business_id uuid,p_prompt text,p_options jsonb,p_correct_answer text,
  p_reward_type public.discount_type,p_reward_value numeric,p_minimum_purchase numeric,
  p_max_coupons integer,p_starts_at timestamptz,p_ends_at timestamptz,
  p_coupon_validity_days integer,p_terms text default null
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare new_question_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.businesses where id=p_business_id and owner_id=auth.uid() and status='approved') then
    raise exception 'An approved business account is required';
  end if;
  if jsonb_typeof(p_options) <> 'array' or jsonb_array_length(p_options) not between 2 and 6 then
    raise exception 'Provide between 2 and 6 answer options';
  end if;
  if not exists(select 1 from jsonb_array_elements_text(p_options) option_text where lower(trim(option_text))=lower(trim(p_correct_answer))) then
    raise exception 'Correct answer must match one of the options';
  end if;
  if p_ends_at <= p_starts_at then raise exception 'End date must be after start date'; end if;
  if p_reward_type='percentage' and p_reward_value > 100 then raise exception 'Percentage discount cannot exceed 100'; end if;
  insert into public.questions(business_id,prompt,options,reward_type,reward_value,minimum_purchase,max_coupons,starts_at,ends_at,coupon_validity_days,terms,status)
  values(p_business_id,trim(p_prompt),p_options,p_reward_type,p_reward_value,coalesce(p_minimum_purchase,0),p_max_coupons,p_starts_at,p_ends_at,p_coupon_validity_days,p_terms,'published')
  returning id into new_question_id;
  insert into public.question_answer_keys(question_id,correct_answer) values(new_question_id,trim(p_correct_answer));
  return new_question_id;
end;
$$;

create or replace function public.submit_answer(p_question_id uuid,p_answer text)
returns table(is_correct boolean,coupon_code text,coupon_valid_until timestamptz,message text)
language plpgsql security definer set search_path = ''
as $$
declare q public.questions%rowtype; correct text; new_code text; expiry timestamptz;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into q from public.questions
  where id=p_question_id and status='published' and starts_at<=now() and ends_at>now()
  for update;
  if not found then return query select false,null::text,null::timestamptz,'This offer is not currently available'::text; return; end if;
  if q.issued_count >= q.max_coupons then return query select false,null::text,null::timestamptz,'All coupons for this offer have been claimed'::text; return; end if;
  if exists(select 1 from public.coupons where customer_id=auth.uid() and question_id=p_question_id) then
    return query select false,null::text,null::timestamptz,'You have already claimed this coupon'::text; return;
  end if;
  select correct_answer into correct from public.question_answer_keys where question_id=p_question_id;
  if lower(trim(coalesce(p_answer,''))) <> lower(trim(correct)) then
    insert into public.answer_attempts(question_id,customer_id,is_correct) values(p_question_id,auth.uid(),false);
    return query select false,null::text,null::timestamptz,'That answer is not correct. Please try again.'::text; return;
  end if;
  new_code := upper(encode(extensions.gen_random_bytes(6),'hex'));
  expiry := now() + make_interval(days => q.coupon_validity_days);
  insert into public.coupons(code,customer_id,business_id,question_id,reward_type,reward_value,minimum_purchase,valid_until)
  values(new_code,auth.uid(),q.business_id,q.id,q.reward_type,q.reward_value,q.minimum_purchase,expiry);
  update public.questions set issued_count=issued_count+1,updated_at=now() where id=q.id;
  insert into public.answer_attempts(question_id,customer_id,is_correct) values(p_question_id,auth.uid(),true);
  return query select true,new_code,expiry,'Correct answer. Your coupon has been created.'::text;
end;
$$;

create or replace function public.redeem_coupon(p_code text)
returns table(success boolean,message text,redeemed_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare c public.coupons%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into c from public.coupons where code=upper(trim(p_code)) for update;
  if not found then return query select false,'Coupon not found'::text,null::timestamptz; return; end if;
  if not exists(select 1 from public.businesses where id=c.business_id and owner_id=auth.uid() and status='approved') then
    raise exception 'You are not authorised to redeem this business coupon';
  end if;
  if c.status <> 'active' then return query select false,('Coupon is '||c.status)::text,c.redeemed_at; return; end if;
  if c.valid_until <= now() then
    update public.coupons set status='expired' where id=c.id;
    return query select false,'Coupon has expired'::text,null::timestamptz; return;
  end if;
  update public.coupons set status='redeemed',redeemed_at=now(),redeemed_by=auth.uid() where id=c.id;
  return query select true,'Coupon successfully redeemed'::text,now();
end;
$$;

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.questions enable row level security;
alter table public.question_answer_keys enable row level security;
alter table public.answer_attempts enable row level security;
alter table public.coupons enable row level security;

create policy "Users can read their own profile" on public.profiles for select to authenticated using(id=auth.uid());
create policy "Approved businesses are publicly discoverable" on public.businesses for select to anon,authenticated using(status='approved');
create policy "Owners can view their own business applications" on public.businesses for select to authenticated using(owner_id=auth.uid());
create policy "Published questions are public" on public.questions for select to anon,authenticated using(
  status='published' and starts_at<=now() and ends_at>now()
  and exists(select 1 from public.businesses b where b.id=business_id and b.status='approved')
);
create policy "Business owners can read their questions" on public.questions for select to authenticated using(
  exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid())
);
create policy "Customers can read their answer attempts" on public.answer_attempts for select to authenticated using(customer_id=auth.uid());
create policy "Customers can read their own coupons" on public.coupons for select to authenticated using(customer_id=auth.uid());
create policy "Business owners can read their issued coupons" on public.coupons for select to authenticated using(
  exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid())
);

revoke all on public.question_answer_keys from anon,authenticated;
revoke insert,update,delete on public.profiles from anon,authenticated;
revoke insert,update,delete on public.businesses from anon,authenticated;
revoke insert,update,delete on public.questions from anon,authenticated;
revoke insert,update,delete on public.answer_attempts from anon,authenticated;
revoke insert,update,delete on public.coupons from anon,authenticated;
grant select on public.businesses,public.questions to anon,authenticated;
grant select on public.profiles,public.answer_attempts,public.coupons to authenticated;
revoke all on function public.update_my_profile(text) from public,anon;\nrevoke all on function public.register_business(text,text,text,text,text,text,text,text,text,double precision,double precision) from public,anon;\nrevoke all on function public.create_question(uuid,text,jsonb,text,public.discount_type,numeric,numeric,integer,timestamptz,timestamptz,integer,text) from public,anon;\nrevoke all on function public.submit_answer(uuid,text) from public,anon;\nrevoke all on function public.redeem_coupon(text) from public,anon;\ngrant execute on function public.update_my_profile(text) to authenticated;
grant execute on function public.register_business(text,text,text,text,text,text,text,text,text,double precision,double precision) to authenticated;
grant execute on function public.create_question(uuid,text,jsonb,text,public.discount_type,numeric,numeric,integer,timestamptz,timestamptz,integer,text) to authenticated;
grant execute on function public.submit_answer(uuid,text) to authenticated;
grant execute on function public.redeem_coupon(text) to authenticated;

-- Admin approval is a trusted manual operation for the first release.
-- Never grant browser users permission to change business status or account roles.
