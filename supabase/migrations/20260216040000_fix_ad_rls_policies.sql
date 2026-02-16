-- Drop the problematic FOR ALL policy and replace with explicit per-operation policies
drop policy if exists "Admin full access" on ad_advertisements;

-- Admin can read ALL ads (including inactive)
create policy "Admin can read all ads"
  on ad_advertisements for select
  using (
    exists (select 1 from usr_role where user_id = auth.uid() and role = 'admin')
  );

-- Admin can insert ads
create policy "Admin can insert ads"
  on ad_advertisements for insert
  with check (
    exists (select 1 from usr_role where user_id = auth.uid() and role = 'admin')
  );

-- Admin can update ads
create policy "Admin can update ads"
  on ad_advertisements for update
  using (
    exists (select 1 from usr_role where user_id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from usr_role where user_id = auth.uid() and role = 'admin')
  );

-- Admin can delete ads
create policy "Admin can delete ads"
  on ad_advertisements for delete
  using (
    exists (select 1 from usr_role where user_id = auth.uid() and role = 'admin')
  );
