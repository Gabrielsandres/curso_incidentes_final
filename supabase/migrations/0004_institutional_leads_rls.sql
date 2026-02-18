-- Harden institutional lead ingestion:
-- - force inserts through server-side service role key
-- - reject malformed payloads at policy level

alter table public.institutional_leads enable row level security;

revoke all on table public.institutional_leads from anon, authenticated;

drop policy if exists "service_role_insert_institutional_leads" on public.institutional_leads;

create policy "service_role_insert_institutional_leads"
  on public.institutional_leads
  for insert
  to service_role
  with check (
    char_length(organization) between 2 and 200
    and char_length(contact_name) between 2 and 200
    and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and (phone is null or char_length(phone) <= 40)
    and (message is null or char_length(message) <= 2000)
    and (headcount is null or (headcount >= 1 and headcount <= 200000))
  );
