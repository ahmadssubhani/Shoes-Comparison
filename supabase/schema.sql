create table products (
  id uuid primary key default gen_random_uuid(),
  brand text,
  title text not null,
  match_key text unique not null,
  image_url text
);

create table offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  store text not null,
  store_title text not null,
  price numeric,
  compare_at_price numeric,
  discount_pct int,
  sizes jsonb default '[]',
  in_stock boolean,
  url text not null,
  image_url text,
  scraped_at timestamptz default now(),
  unique (store, url)
);

alter table products enable row level security;
alter table offers enable row level security;

create policy "public read products" on products for select using (true);
create policy "public read offers" on offers for select using (true);
