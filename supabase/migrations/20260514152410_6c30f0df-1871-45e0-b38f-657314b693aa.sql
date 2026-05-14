-- Add explicit deny-all RLS policies so direct client access is blocked
create policy "deny all select app_settings"
on public.app_settings
for select
to public
using (false);

create policy "deny all insert app_settings"
on public.app_settings
for insert
to public
with check (false);

create policy "deny all update app_settings"
on public.app_settings
for update
to public
using (false)
with check (false);

create policy "deny all delete app_settings"
on public.app_settings
for delete
to public
using (false);

create policy "deny all select access_codes"
on public.access_codes
for select
to public
using (false);

create policy "deny all insert access_codes"
on public.access_codes
for insert
to public
with check (false);

create policy "deny all update access_codes"
on public.access_codes
for update
to public
using (false)
with check (false);

create policy "deny all delete access_codes"
on public.access_codes
for delete
to public
using (false);

create policy "deny all select asset_link_patterns"
on public.asset_link_patterns
for select
to public
using (false);

create policy "deny all insert asset_link_patterns"
on public.asset_link_patterns
for insert
to public
with check (false);

create policy "deny all update asset_link_patterns"
on public.asset_link_patterns
for update
to public
using (false)
with check (false);

create policy "deny all delete asset_link_patterns"
on public.asset_link_patterns
for delete
to public
using (false);

create policy "deny all select sg_template_words"
on public.sg_template_words
for select
to public
using (false);

create policy "deny all insert sg_template_words"
on public.sg_template_words
for insert
to public
with check (false);

create policy "deny all update sg_template_words"
on public.sg_template_words
for update
to public
using (false)
with check (false);

create policy "deny all delete sg_template_words"
on public.sg_template_words
for delete
to public
using (false);