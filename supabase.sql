-- Profiles + auth bootstrap
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  plan text not null default 'free',
  subscription_status text not null default 'inactive',
  subscription_provider text,
  subscription_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "users can view own profile" on public.profiles;
create policy "users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Generic helper tables owned by authenticated user
create table if not exists public.accounts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  currency text not null default 'ARS',
  balance numeric not null default 0,
  provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id text references public.accounts(id) on delete set null,
  kind text not null,
  amount numeric not null,
  currency text not null default 'ARS',
  category text not null,
  note text,
  date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.debts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  person text not null,
  total numeric not null,
  remaining numeric not null,
  currency text not null default 'ARS',
  due_date date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.installments (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id text references public.accounts(id) on delete set null,
  title text not null,
  total numeric not null,
  installments integer not null,
  paid_count integer not null default 0,
  installment_amount numeric not null,
  currency text not null default 'ARS',
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_cards (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  bank text not null,
  closing_day integer not null,
  due_day integer not null,
  limit_amount numeric not null,
  available_amount numeric not null,
  currency text not null default 'ARS',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.card_purchases (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text references public.credit_cards(id) on delete cascade,
  title text not null,
  total numeric not null,
  installments integer not null,
  current_installment integer not null default 1,
  installment_amount numeric not null,
  purchase_date date not null,
  next_due_month date,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists accounts_user_id_idx on public.accounts(user_id);
create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists debts_user_id_idx on public.debts(user_id);
create index if not exists installments_user_id_idx on public.installments(user_id);
create index if not exists credit_cards_user_id_idx on public.credit_cards(user_id);
create index if not exists card_purchases_user_id_idx on public.card_purchases(user_id);
create index if not exists card_purchases_card_id_idx on public.card_purchases(card_id);

alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.debts enable row level security;
alter table public.installments enable row level security;
alter table public.credit_cards enable row level security;
alter table public.card_purchases enable row level security;

do $$
declare
  table_name text;
begin
  for table_name in
    select unnest(array['accounts', 'transactions', 'debts', 'installments', 'credit_cards', 'card_purchases'])
  loop
    execute format('drop policy if exists "select_own_%1$s" on public.%1$s', table_name);
    execute format('drop policy if exists "insert_own_%1$s" on public.%1$s', table_name);
    execute format('drop policy if exists "update_own_%1$s" on public.%1$s', table_name);
    execute format('drop policy if exists "delete_own_%1$s" on public.%1$s', table_name);

    execute format('create policy "select_own_%1$s" on public.%1$s for select using (auth.uid() = user_id)', table_name);
    execute format('create policy "insert_own_%1$s" on public.%1$s for insert with check (auth.uid() = user_id)', table_name);
    execute format('create policy "update_own_%1$s" on public.%1$s for update using (auth.uid() = user_id)', table_name);
    execute format('create policy "delete_own_%1$s" on public.%1$s for delete using (auth.uid() = user_id)', table_name);

    execute format('drop trigger if exists %1$s_set_updated_at on public.%1$s', table_name);
    execute format('create trigger %1$s_set_updated_at before update on public.%1$s for each row execute procedure public.set_updated_at()', table_name);
  end loop;
end $$;
