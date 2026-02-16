-- Ad management table
create table "ad_advertisements" (
  "ad_id"       uuid primary key default gen_random_uuid(),
  "title"       text not null,
  "description" text,
  "image_url"   text,
  "link_url"    text,
  "event_id"    uuid references evt_events(event_id) on delete set null,  -- NULL = global ad
  "sort_order"  integer default 0,
  "is_active"   boolean default true,
  "start_date"  timestamp with time zone,
  "end_date"    timestamp with time zone,
  "created_by"  uuid,
  "created_at"  timestamp with time zone default now(),
  "updated_at"  timestamp with time zone default now()
);

-- RLS policies
alter table ad_advertisements enable row level security;

create policy "Anyone can read active ads"
  on ad_advertisements for select
  using (is_active = true);

create policy "Admin full access"
  on ad_advertisements for all
  using (
    exists (select 1 from usr_role where user_id = auth.uid() and role = 'admin')
  );
