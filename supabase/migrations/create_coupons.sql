create table if not exists coupons (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric not null,
  max_uses integer default null,
  used_count integer default 0,
  min_purchase numeric default 0,
  expires_at timestamptz default null,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists coupon_uses (
  id uuid default gen_random_uuid() primary key,
  coupon_id uuid references coupons(id),
  user_id uuid references auth.users(id),
  payment_id text,
  created_at timestamptz default now()
);

create index if not exists idx_coupons_code on coupons(code);
create index if not exists idx_coupon_uses_user on coupon_uses(user_id);
create index if not exists idx_coupon_uses_coupon on coupon_uses(coupon_id);
