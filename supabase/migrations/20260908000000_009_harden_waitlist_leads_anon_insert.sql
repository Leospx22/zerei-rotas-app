begin;

revoke insert on table public.waitlist_leads from anon;

grant insert (
  name,
  whatsapp,
  main_platform,
  email,
  city
)
on table public.waitlist_leads
to anon;

commit;
