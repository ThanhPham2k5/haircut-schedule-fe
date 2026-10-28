-- =====================================================================
-- Vanguard & Blade - Supabase schema (theo ERD của đồ án)
--
-- Cách chạy: Supabase Dashboard -> SQL Editor -> dán toàn bộ file -> Run.
-- File có thể chạy lại nhiều lần (idempotent).
--
-- Ánh xạ ERD:
--   user              -> auth.users (email, mật khẩu băm) + public.profiles
--   barber_schedule   -> public.barber_schedule
--   bookings          -> public.bookings
--   booking_services  -> public.booking_services
--   services          -> public.services
-- Phần mở rộng so với ERD (FE cần): profiles.specialty/bio/rating/review_count/
-- is_locked/email_verified, services.tagline/category/icon_name/popular,
-- bookings.notes và trạng thái 'in_progress' (Đang phục vụ).
-- =====================================================================

set search_path = public, extensions;

create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------
-- 1. Bảng dữ liệu
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text not null default '',
  role text not null default 'customer'
    check (role in ('customer', 'barber', 'admin')),
  specialty text,
  bio text,
  rating numeric(3, 2),
  review_count integer not null default 0,
  is_locked boolean not null default false,
  email_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tagline text not null default '',
  description text not null default '',
  price integer not null check (price >= 0),
  duration_minutes integer not null check (duration_minutes between 5 and 480),
  category text not null default 'haircut'
    check (category in ('haircut', 'beard', 'combo', 'treatment')),
  icon_name text not null default 'Scissors',
  popular boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- day_of_week: 0 = Chủ nhật ... 6 = Thứ bảy (giống Date.getDay() của JS)
create table if not exists public.barber_schedule (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.profiles (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null default '08:30',
  end_time time not null default '20:30',
  is_off boolean not null default false,
  constraint barber_schedule_unique_day unique (barber_id, day_of_week),
  constraint barber_schedule_time_order check (end_time > start_time)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  barber_id uuid not null references public.profiles (id) on delete restrict,
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  total_price integer not null default 0 check (total_price >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  constraint bookings_time_order check (end_time > start_time),
  -- Chống trùng lịch ngay ở tầng DB: một thợ không thể có 2 lịch (chưa huỷ) chồng giờ nhau.
  constraint bookings_no_overlap exclude using gist (
    barber_id with =,
    tsrange(booking_date + start_time, booking_date + end_time, '[)') with &&
  ) where (status <> 'cancelled')
);

create table if not exists public.booking_services (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete restrict,
  price_at_booking integer not null check (price_at_booking >= 0),
  primary key (booking_id, service_id)
);

create index if not exists bookings_customer_idx on public.bookings (customer_id);
create index if not exists bookings_barber_date_idx on public.bookings (barber_id, booking_date);

-- ---------------------------------------------------------------------
-- 2. Hàm hỗ trợ phân quyền (security definer để tránh đệ quy RLS)
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.is_locked = false
  );
$$;

-- ---------------------------------------------------------------------
-- 3. Trigger
-- ---------------------------------------------------------------------
-- Tạo profile khi có user mới. Role CHỈ lấy từ app_metadata (chỉ server/service role
-- ghi được), tuyệt đối không tin user_metadata do client gửi lên khi đăng ký.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := coalesce(new.raw_app_meta_data ->> 'role', 'customer');
  if v_role not in ('customer', 'barber', 'admin') then
    v_role := 'customer';
  end if;

  insert into public.profiles (id, email, full_name, phone, role, email_verified)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    v_role,
    new.email_confirmed_at is not null
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.profiles set email_verified = true where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.handle_user_email_confirmed();

-- Thợ mới được tạo -> sinh sẵn lịch làm việc 7 ngày (08:30 - 20:30)
create or replace function public.handle_barber_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'barber' then
    insert into public.barber_schedule (barber_id, day_of_week)
    select new.id, d from generate_series(0, 6) as d
    on conflict (barber_id, day_of_week) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_barber_defaults on public.profiles;
create trigger on_profile_barber_defaults
  after insert or update of role on public.profiles
  for each row execute function public.handle_barber_defaults();

-- Người dùng thường chỉ được sửa họ tên / SĐT / chuyên môn / giới thiệu của chính mình.
-- Các cột nhạy cảm (role, is_locked, rating...) chỉ admin hoặc service role mới đổi được.
create or replace function public.profiles_guard_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.id := old.id;
    new.role := old.role;
    new.is_locked := old.is_locked;
    new.email := old.email;
    new.email_verified := old.email_verified;
    new.rating := old.rating;
    new.review_count := old.review_count;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_update on public.profiles;
create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function public.profiles_guard_update();

-- ---------------------------------------------------------------------
-- 4. View công khai: thông tin thợ an toàn (không lộ email / SĐT)
-- ---------------------------------------------------------------------
-- Cố ý chạy với quyền của owner để khách (kể cả chưa đăng nhập) xem được danh sách thợ.
create or replace view public.public_barbers as
  select id, full_name, specialty, bio, rating, review_count, is_locked
  from public.profiles
  where role = 'barber';

-- ---------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.barber_schedule enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_services enable row level security;

-- profiles
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select to authenticated using (public.is_admin());

drop policy if exists profiles_select_barber_customers on public.profiles;
create policy profiles_select_barber_customers on public.profiles
  for select to authenticated using (
    exists (
      select 1 from public.bookings b
      where b.barber_id = auth.uid() and b.customer_id = profiles.id
    )
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() and is_locked = false)
  with check (id = auth.uid());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- services: ai cũng xem được bảng giá; chỉ admin chỉnh sửa
drop policy if exists services_select_all on public.services;
create policy services_select_all on public.services
  for select to anon, authenticated using (true);

drop policy if exists services_insert_admin on public.services;
create policy services_insert_admin on public.services
  for insert to authenticated with check (public.is_admin());

drop policy if exists services_update_admin on public.services;
create policy services_update_admin on public.services
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists services_delete_admin on public.services;
create policy services_delete_admin on public.services
  for delete to authenticated using (public.is_admin());

-- barber_schedule: người đã đăng nhập xem được; admin hoặc chính thợ đó chỉnh sửa
drop policy if exists schedule_select_auth on public.barber_schedule;
create policy schedule_select_auth on public.barber_schedule
  for select to authenticated using (true);

drop policy if exists schedule_insert on public.barber_schedule;
create policy schedule_insert on public.barber_schedule
  for insert to authenticated
  with check (public.is_admin() or barber_id = auth.uid());

drop policy if exists schedule_update on public.barber_schedule;
create policy schedule_update on public.barber_schedule
  for update to authenticated
  using (public.is_admin() or barber_id = auth.uid())
  with check (public.is_admin() or barber_id = auth.uid());

drop policy if exists schedule_delete on public.barber_schedule;
create policy schedule_delete on public.barber_schedule
  for delete to authenticated
  using (public.is_admin() or barber_id = auth.uid());

-- bookings: chỉ đọc theo vai trò. Tạo / đổi trạng thái / sửa đều đi qua RPC bên dưới.
drop policy if exists bookings_select on public.bookings;
create policy bookings_select on public.bookings
  for select to authenticated using (
    customer_id = auth.uid() or barber_id = auth.uid() or public.is_admin()
  );

drop policy if exists bookings_delete_admin on public.bookings;
create policy bookings_delete_admin on public.bookings
  for delete to authenticated using (public.is_admin());

-- booking_services: thấy được khi thấy được booking tương ứng
drop policy if exists booking_services_select on public.booking_services;
create policy booking_services_select on public.booking_services
  for select to authenticated using (
    exists (select 1 from public.bookings b where b.id = booking_services.booking_id)
  );

-- ---------------------------------------------------------------------
-- 6. RPC (security definer) - toàn bộ nghiệp vụ đặt lịch nằm ở đây
--    Lỗi nghiệp vụ được ném ra dưới dạng mã chữ (SLOT_TAKEN, BARBER_OFF...),
--    FE ánh xạ sang tiếng Việt trong src/lib/errors.ts.
-- ---------------------------------------------------------------------

-- Các khoảng giờ đã bận của thợ trong ngày (không lộ thông tin khách)
create or replace function public.get_barber_busy(
  p_barber_id uuid,
  p_date date,
  p_exclude_booking_id uuid default null
)
returns table (start_time time, end_time time)
language sql
stable
security definer
set search_path = public
as $$
  select b.start_time, b.end_time
  from public.bookings b
  where b.barber_id = p_barber_id
    and b.booking_date = p_date
    and b.status <> 'cancelled'
    and (p_exclude_booking_id is null or b.id <> p_exclude_booking_id)
  order by b.start_time;
$$;

-- Khách đặt lịch: giá, thời lượng, giờ kết thúc đều do server tính, không tin client
create or replace function public.create_booking(
  p_barber_id uuid,
  p_date date,
  p_start_time time,
  p_service_ids uuid[],
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_found integer;
  v_expected integer;
  v_duration integer;
  v_total integer;
  v_start_min integer;
  v_end_time time;
  v_sched public.barber_schedule%rowtype;
  v_booking_id uuid;
  v_now_vn timestamp := (now() at time zone 'Asia/Ho_Chi_Minh');
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select role into v_role from public.profiles where id = v_uid and is_locked = false;
  if v_role is distinct from 'customer' then
    raise exception 'FORBIDDEN';
  end if;

  if p_service_ids is null or coalesce(array_length(p_service_ids, 1), 0) = 0 then
    raise exception 'SERVICE_REQUIRED';
  end if;

  select count(distinct x) into v_expected from unnest(p_service_ids) as x;
  select count(*)::int, coalesce(sum(duration_minutes), 0)::int, coalesce(sum(price), 0)::int
    into v_found, v_duration, v_total
  from public.services
  where id = any (p_service_ids) and is_active = true;
  if v_found <> v_expected then
    raise exception 'SERVICE_UNAVAILABLE';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_barber_id and role = 'barber' and is_locked = false
  ) then
    raise exception 'BARBER_UNAVAILABLE';
  end if;

  v_start_min := extract(hour from p_start_time)::int * 60 + extract(minute from p_start_time)::int;
  if v_start_min + v_duration >= 1440 then
    raise exception 'OUTSIDE_SCHEDULE';
  end if;
  v_end_time := time '00:00' + make_interval(mins => v_start_min + v_duration);

  if (p_date + p_start_time) <= v_now_vn then
    raise exception 'PAST_SLOT';
  end if;

  select * into v_sched
  from public.barber_schedule
  where barber_id = p_barber_id and day_of_week = extract(dow from p_date)::int;
  if not found or v_sched.is_off then
    raise exception 'BARBER_OFF';
  end if;
  if p_start_time < v_sched.start_time or v_end_time > v_sched.end_time then
    raise exception 'OUTSIDE_SCHEDULE';
  end if;

  begin
    insert into public.bookings
      (customer_id, barber_id, booking_date, start_time, end_time, total_price, status, notes)
    values
      (v_uid, p_barber_id, p_date, p_start_time, v_end_time, v_total, 'pending',
       nullif(left(trim(coalesce(p_notes, '')), 500), ''))
    returning id into v_booking_id;
  exception when exclusion_violation then
    raise exception 'SLOT_TAKEN';
  end;

  insert into public.booking_services (booking_id, service_id, price_at_booking)
  select v_booking_id, s.id, s.price from public.services s where s.id = any (p_service_ids);

  return v_booking_id;
end;
$$;

-- Đổi trạng thái lịch hẹn theo vai trò
create or replace function public.set_booking_status(p_booking_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_b public.bookings%rowtype;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_status not in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') then
    raise exception 'INVALID_STATUS';
  end if;

  select role into v_role from public.profiles where id = v_uid and is_locked = false;
  if v_role is null then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_b from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  if v_role = 'admin' then
    null;
  elsif v_role = 'customer' then
    if v_b.customer_id <> v_uid or p_status <> 'cancelled'
       or v_b.status not in ('pending', 'confirmed') then
      raise exception 'FORBIDDEN';
    end if;
  elsif v_role = 'barber' then
    if v_b.barber_id <> v_uid then
      raise exception 'FORBIDDEN';
    end if;
    if not (
      (v_b.status = 'pending' and p_status in ('confirmed', 'cancelled'))
      or (v_b.status = 'confirmed' and p_status in ('in_progress', 'cancelled'))
      or (v_b.status = 'in_progress' and p_status in ('completed', 'cancelled'))
    ) then
      raise exception 'INVALID_TRANSITION';
    end if;
  else
    raise exception 'FORBIDDEN';
  end if;

  begin
    update public.bookings set status = p_status where id = p_booking_id;
  exception when exclusion_violation then
    raise exception 'SLOT_TAKEN';
  end;
end;
$$;

-- Admin sửa lịch hẹn (đổi thợ / ngày / giờ / dịch vụ / trạng thái / ghi chú)
create or replace function public.admin_update_booking(
  p_booking_id uuid,
  p_barber_id uuid,
  p_date date,
  p_start_time time,
  p_service_ids uuid[],
  p_status text,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current uuid[];
  v_new uuid[];
  v_found integer;
  v_duration integer;
  v_total integer;
  v_start_min integer;
  v_end_time time;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if p_status not in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') then
    raise exception 'INVALID_STATUS';
  end if;
  if not exists (select 1 from public.bookings where id = p_booking_id) then
    raise exception 'BOOKING_NOT_FOUND';
  end if;
  if not exists (select 1 from public.profiles where id = p_barber_id and role = 'barber') then
    raise exception 'BARBER_UNAVAILABLE';
  end if;
  if p_service_ids is null or coalesce(array_length(p_service_ids, 1), 0) = 0 then
    raise exception 'SERVICE_REQUIRED';
  end if;

  select array_agg(distinct x order by x) into v_new from unnest(p_service_ids) as x;
  select coalesce(array_agg(service_id order by service_id), '{}'::uuid[]) into v_current
  from public.booking_services where booking_id = p_booking_id;

  select count(*)::int, coalesce(sum(duration_minutes), 0)::int, coalesce(sum(price), 0)::int
    into v_found, v_duration, v_total
  from public.services where id = any (v_new);
  if v_found <> array_length(v_new, 1) then
    raise exception 'SERVICE_UNAVAILABLE';
  end if;

  -- giữ nguyên giá đã chốt nếu không đổi dịch vụ
  if v_current = v_new then
    select coalesce(sum(price_at_booking), 0)::int into v_total
    from public.booking_services where booking_id = p_booking_id;
  end if;

  v_start_min := extract(hour from p_start_time)::int * 60 + extract(minute from p_start_time)::int;
  if v_start_min + v_duration >= 1440 then
    raise exception 'OUTSIDE_SCHEDULE';
  end if;
  v_end_time := time '00:00' + make_interval(mins => v_start_min + v_duration);

  begin
    update public.bookings
    set barber_id = p_barber_id,
        booking_date = p_date,
        start_time = p_start_time,
        end_time = v_end_time,
        total_price = v_total,
        status = p_status,
        notes = nullif(left(trim(coalesce(p_notes, '')), 500), '')
    where id = p_booking_id;
  exception when exclusion_violation then
    raise exception 'SLOT_TAKEN';
  end;

  if v_current <> v_new then
    delete from public.booking_services where booking_id = p_booking_id;
    insert into public.booking_services (booking_id, service_id, price_at_booking)
    select p_booking_id, s.id, s.price from public.services s where s.id = any (v_new);
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Quyền truy cập (grant tường minh, an toàn cả khi project tắt default grants)
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.services to anon, authenticated;
grant select on public.public_barbers to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.barber_schedule to authenticated;
grant select, delete on public.bookings to authenticated;
grant select on public.booking_services to authenticated;
grant insert, update, delete on public.services to authenticated;

revoke all on function public.create_booking(uuid, date, time, uuid[], text) from public, anon;
revoke all on function public.set_booking_status(uuid, text) from public, anon;
revoke all on function public.admin_update_booking(uuid, uuid, date, time, uuid[], text, text) from public, anon;
revoke all on function public.get_barber_busy(uuid, date, uuid) from public, anon;
grant execute on function public.create_booking(uuid, date, time, uuid[], text) to authenticated;
grant execute on function public.set_booking_status(uuid, text) to authenticated;
grant execute on function public.admin_update_booking(uuid, uuid, date, time, uuid[], text, text) to authenticated;
grant execute on function public.get_barber_busy(uuid, date, uuid) to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
