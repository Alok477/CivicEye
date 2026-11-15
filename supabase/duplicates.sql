-- Run once, after schema.sql.
-- Radius + same-category + trigram text similarity, computed in Postgres.

create or replace function public.find_duplicate_candidates(
  p_complaint_id uuid,
  p_radius_m     int default 150
) returns table (id uuid, distance_m double precision, text_similarity real)
language sql stable security definer
set search_path = public, extensions as $$
  with base as (
    select * from public.complaints where complaints.id = p_complaint_id
  )
  select c.id,
         d.dist as distance_m,
         similarity(
           coalesce(c.title,'') || ' ' || coalesce(c.description,''),
           coalesce(b.title,'') || ' ' || coalesce(b.description,'')
         )::real as text_similarity
  from base b
  join public.complaints c
    on c.id <> b.id
   and c.category = b.category
   and c.status <> 'REJECTED'
   and c.latitude between b.latitude - (p_radius_m / 111000.0)
                      and b.latitude + (p_radius_m / 111000.0)
  cross join lateral (
    select 2 * 6371000 * asin(least(1, sqrt(
      power(sin(radians(c.latitude - b.latitude) / 2), 2) +
      cos(radians(b.latitude)) * cos(radians(c.latitude)) *
      power(sin(radians(c.longitude - b.longitude) / 2), 2)
    ))) as dist
  ) d
  where d.dist <= p_radius_m
  order by d.dist
  limit 25;
$$;

revoke execute on function public.find_duplicate_candidates(uuid, int) from public, anon, authenticated;
grant  execute on function public.find_duplicate_candidates(uuid, int) to service_role;
