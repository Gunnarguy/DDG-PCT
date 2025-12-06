-- Optional RLS policies for anon-key-only access
-- Enable RLS before applying these: alter table <table> enable row level security;

-- Ops logs: allow open read/insert and status updates
create policy "ops_logs_select_all" on ops_logs
  for
select using (true);

create policy "ops_logs_insert_all" on ops_logs
  for
insert with check
    (true)
;

create policy "ops_logs_update_status" on ops_logs
  for
update using (true)
  with check (true);

-- Gear loadouts: open read/upsert (per-hiker could be enforced if you add auth)
create policy "gear_loadouts_select_all" on gear_loadouts
  for
select using (true);

create policy "gear_loadouts_upsert_all" on gear_loadouts
  for
insert with check
    (true)
;

create policy "gear_loadouts_update_all" on gear_loadouts
  for
update using (true)
  with check (true);

-- Custom items: open read/insert/update (tighten if you add auth)
create policy "custom_items_select_all" on custom_items
  for
select using (true);

create policy "custom_items_insert_all" on custom_items
  for
insert with check
    (true)
;

create policy "custom_items_update_all" on custom_items
  for
update using (true)
  with check (true);
