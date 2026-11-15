-- =====================================================================
-- CivicEye demo seed. ALL rows are flagged is_demo = true.
-- Synthetic data around Connaught Place, New Delhi (28.6139, 77.2090).
-- Coordinates are approximate offsets; streets are plausible labels only.
-- No real municipal records are represented.
--
-- BEFORE RUNNING: create two users in Supabase Dashboard
--   Authentication -> Users -> Add user (tick "Auto Confirm User"):
--     citizen@civiceye.demo   (any password)
--     admin@civiceye.demo     (any password)
--   then promote the admin:
--     update public.users set role = 'admin' where email = 'admin@civiceye.demo';
--
-- Run schema.sql and duplicates.sql first. Safe to re-run: it replaces all demo rows.
-- (complaint_number keeps counting up on re-run; the sequence is not reset.)
-- =====================================================================

do $seed$
declare
  v_citizen uuid;
  v_admin   uuid;
  v_group   uuid := gen_random_uuid();
  v_orig    uuid;
begin
  select id into v_citizen from public.users where email = 'citizen@civiceye.demo';
  select id into v_admin   from public.users where email = 'admin@civiceye.demo';
  if v_citizen is null or v_admin is null then
    raise exception 'Create citizen@civiceye.demo and admin@civiceye.demo first (see header).';
  end if;

  delete from public.complaints where is_demo = true;

  -- owner: c = demo citizen, a = demo admin account (acting as a second citizen)
  insert into public.complaints
    (user_id, title, description, ai_description, category, subcategory, severity,
     priority_score, ai_confidence, safety_risk, department, latitude, longitude,
     address, status, is_demo, created_at, updated_at)
  select
    case s.owner when 'c' then v_citizen else v_admin end,
    s.title, s.description, s.ai_description, s.category, s.subcategory, s.severity,
    s.score, s.conf, s.safety, s.dept,
    28.6139 + s.dlat, 77.2090 + s.dlng,
    s.address, s.status, true,
    now() - make_interval(hours => s.hours_ago),
    case when s.status = 'SUBMITTED'
         then now() - make_interval(hours => s.hours_ago)
         else least(now(), now() - make_interval(hours => s.hours_ago)
                           + make_interval(hours => case s.status when 'RESOLVED' then 60 else 20 end))
    end
  from (values
    (690,'c','Overflowing garbage bin near Janpath market','Bin has been overflowing for days and waste is spilling onto the pavement.','Overflowing public bin with waste spilling onto the pavement.','Garbage & Sanitation','Overflowing bin','Medium',46,0.88,false,'Sanitation',0.0040,-0.0010,'Janpath, New Delhi','RESOLVED'),
    (670,'a','Street light not working on Barakhamba Road','The light has been off for a week and the stretch is dark at night.','Street light pole with the lamp not illuminated.','Street Lighting','Non-functional light','Medium',52,0.90,false,'Electrical & Lighting',0.0020,0.0120,'Barakhamba Road, New Delhi','RESOLVED'),
    (640,'c','Water pipe leaking onto footpath','Clean water has been leaking from a joint for two days.','Water leaking from a pipe joint and pooling on the footpath.','Water Supply & Leakage','Pipe leakage','High',64,0.86,false,'Water Works',-0.0060,0.0040,'Kasturba Gandhi Marg, New Delhi','RESOLVED'),
    (610,'c','Open manhole beside bus stop','Manhole cover is missing right next to the bus stop, no barrier around it.','Open manhole without cover or barrier next to a pedestrian area.','Drainage & Sewage','Open manhole','Critical',92,0.93,true,'Drainage & Sewerage',0.0080,-0.0040,'Tolstoy Marg, New Delhi','RESOLVED'),
    (560,'a','Broken footpath tiles near crossing','Several tiles are cracked and lifted, people trip on them.','Cracked and displaced paving tiles on a footpath.','Public Infrastructure','Damaged footpath','Low',24,0.80,false,'General Administration',-0.0030,-0.0070,'Sansad Marg, New Delhi','RESOLVED'),
    (520,'c','Blocked drain causing waterlogging','The roadside drain is clogged and water stands after light rain.','Roadside drain choked with debris and standing water at the road edge.','Drainage & Sewage','Blocked drain','High',71,0.87,false,'Drainage & Sewerage',-0.0090,0.0050,'Ashoka Road, New Delhi','IN_PROGRESS'),
    (480,'c','Pothole on Tolstoy Marg','Medium sized pothole in the left lane, two-wheelers swerve around it.','Medium pothole in the surface of a carriageway.','Road Damage','Pothole','Medium',55,0.89,false,'Road Maintenance',-0.0120,-0.0090,'Tolstoy Marg, New Delhi','IN_PROGRESS'),
    (440,'a','Garbage dumped on vacant plot','Mixed waste and construction debris dumped on an empty plot.','Mixed waste and debris dumped on open ground.','Garbage & Sanitation','Illegal dumping','Medium',48,0.84,false,'Sanitation',0.0150,0.0110,'Mandi House, New Delhi','ASSIGNED'),
    (400,'c','Exposed electric wires hanging from pole','Wires hang low near a tea stall and the insulation looks torn.','Exposed electrical wires hanging from a utility pole.','Public Safety','Exposed wiring','Critical',90,0.91,true,'Public Safety',0.0050,0.0150,'Bhagat Singh Marg, New Delhi','ASSIGNED'),
    (370,'c','Faded zebra crossing','Zebra crossing markings have almost disappeared.','Faded pedestrian crossing markings on a road.','Road Damage','Faded road markings','Low',26,0.78,false,'Road Maintenance',-0.0140,0.0020,'Janpath, New Delhi','RESOLVED'),
    (330,'a','Sewage overflow in lane','Sewage is overflowing onto the lane and smells strongly.','Sewage overflowing from a manhole onto the road.','Drainage & Sewage','Sewage overflow','High',78,0.89,true,'Drainage & Sewerage',0.0030,-0.0120,'Jantar Mantar Road, New Delhi','UNDER_REVIEW'),
    (300,'c','Street light flickering near park','Light flickers all evening and goes off at random.','Street lamp that appears to flicker; no visible physical damage.','Street Lighting','Flickering light','Low',28,0.74,false,'Electrical & Lighting',-0.0050,0.0170,'Barakhamba Road, New Delhi','UNDER_REVIEW'),
    (270,'c','Low tree branch hanging over road','A heavy branch is cracked and hanging over the carriageway.','Large partially broken tree branch overhanging a road.','Public Safety','Hazardous tree branch','Medium',57,0.82,true,'Public Safety',0.0120,-0.0080,'Ashoka Road, New Delhi','ASSIGNED'),
    (240,'a','Muddy water in supply line','Tap water has been brown since yesterday morning.','Reported discoloured tap water; no photo of the source was provided.','Water Supply & Leakage','Contaminated supply','High',63,0.70,false,'Water Works',-0.0020,0.0030,'Connaught Place, New Delhi','IN_PROGRESS'),
    (200,'c','Complaint about private building drain','The drain inside a private compound is blocked.','Report concerns a drain inside private property.','Drainage & Sewage','Private drain','Low',14,0.55,false,'Drainage & Sewerage',0.0070,0.0090,'Barakhamba Road, New Delhi','REJECTED'),
    (180,'a','Cracked road surface near roundabout','Long cracks run across the lane and water seeps in.','Longitudinal cracks across a road surface.','Road Damage','Surface cracks','Medium',41,0.83,false,'Road Maintenance',-0.0100,0.0130,'Kasturba Gandhi Marg, New Delhi','SUBMITTED'),
    (160,'c','Street light pole leaning dangerously','The pole is tilted after a vehicle hit it and may fall.','Tilted street light pole beside the roadside.','Street Lighting','Damaged pole','High',68,0.85,true,'Electrical & Lighting',0.0090,0.0020,'Tolstoy Marg, New Delhi','UNDER_REVIEW'),
    (140,'c','Broken public bench in park','Two slats are missing on the bench near the entrance.','Public bench with missing slats.','Public Infrastructure','Damaged street furniture','Low',17,0.81,false,'General Administration',-0.0080,-0.0010,'Sansad Marg, New Delhi','SUBMITTED'),
    (120,'a','Drain cover missing near market','The cover is gone, leaving an open drain beside the main walkway.','Uncovered drain opening beside a pedestrian walkway.','Drainage & Sewage','Missing drain cover','Critical',85,0.90,true,'Drainage & Sewerage',0.0040,-0.0090,'Janpath, New Delhi','ASSIGNED'),
    (100,'c','Burst pipe flooding the road','Water is gushing from a burst main and the road is partly flooded.','Water gushing from a burst pipe and flooding the road.','Water Supply & Leakage','Pipe burst','Critical',82,0.92,true,'Water Works',-0.0110,-0.0050,'Ashoka Road, New Delhi','IN_PROGRESS'),
    (90,'c','Garbage not collected at bus stop','Waste around the bus stop has not been cleared for days.','Accumulated uncollected garbage around a bus stop.','Garbage & Sanitation','Uncollected garbage','Medium',44,0.86,false,'Sanitation',0.0155,0.0105,'Mandi House, New Delhi','SUBMITTED'),
    (80,'a','Garbage pile near Mandi House (second report)','Same dumping spot as before and the pile is bigger now.','Pile of mixed waste on open ground.','Garbage & Sanitation','Illegal dumping','Medium',47,0.80,false,'Sanitation',0.0152,0.0112,'Mandi House, New Delhi','DUPLICATE'),
    (70,'a','Graffiti on public wall','Spray paint covers the boundary wall of the library.','Spray paint graffiti on a wall.','Other','Vandalism','Low',9,0.72,false,'General Administration',-0.0150,-0.0110,'Bhagat Singh Marg, New Delhi','SUBMITTED'),
    -- Deliberate near-duplicates: one pothole, four reports, different wording
    (62,'c','Large pothole on Barakhamba Road near signal','Pothole about 40 cm wide and 10 cm deep in the left lane, filled with water.','Large pothole in the road surface, partly filled with water.','Road Damage','Pothole','High',76,0.92,true,'Road Maintenance',0.01760,0.00770,'Barakhamba Road, New Delhi','UNDER_REVIEW'),
    (50,'a','Deep hole in road, vehicles swerving at the crossing','A deep hole has opened on the carriageway and bikes swerve suddenly to avoid it.','Deep hole in a carriageway near a crossing.','Road Damage','Pothole','High',72,0.85,true,'Road Maintenance',0.01763,0.00774,'Barakhamba Road, New Delhi','SUBMITTED'),
    (30,'c','Road caved in near traffic light','The road surface has sunk and broken near the signal, tyres are getting damaged.','Sunken and broken road surface near a signal.','Road Damage','Pothole','High',70,0.80,true,'Road Maintenance',0.01757,0.00766,'Barakhamba Road, New Delhi','SUBMITTED'),
    (10,'a','Please fix this tyre-busting crater','Crater in the road by the signal, water collects in it after rain.','Large crater in a road surface holding water.','Road Damage','Pothole','High',68,0.82,true,'Road Maintenance',0.01768,0.00779,'Barakhamba Road, New Delhi','SUBMITTED')
  ) as s(hours_ago, owner, title, description, ai_description, category, subcategory,
         severity, score, conf, safety, dept, dlat, dlng, address, status)
  order by s.hours_ago desc;   -- oldest first so complaint numbers follow time order

  -- Replace trigger-generated rows with a realistic history
  delete from public.notifications     where complaint_id in (select id from public.complaints where is_demo);
  delete from public.complaint_updates where complaint_id in (select id from public.complaints where is_demo);

  insert into public.complaint_updates (complaint_id, previous_status, new_status, remarks, updated_by, created_at)
  select id, null, 'SUBMITTED', 'Complaint submitted', user_id, created_at
  from public.complaints where is_demo;

  with paths as (
    select c.id, c.created_at, c.updated_at,
      case c.status
        when 'UNDER_REVIEW' then array['UNDER_REVIEW']
        when 'ASSIGNED'     then array['UNDER_REVIEW','ASSIGNED']
        when 'IN_PROGRESS'  then array['UNDER_REVIEW','ASSIGNED','IN_PROGRESS']
        when 'RESOLVED'     then array['UNDER_REVIEW','ASSIGNED','IN_PROGRESS','RESOLVED']
        when 'REJECTED'     then array['UNDER_REVIEW','REJECTED']
        when 'DUPLICATE'    then array['UNDER_REVIEW','DUPLICATE']
        else array[]::text[]
      end as steps
    from public.complaints c where c.is_demo
  )
  insert into public.complaint_updates (complaint_id, previous_status, new_status, remarks, updated_by, created_at)
  select p.id,
         case when s.i = 1 then 'SUBMITTED' else p.steps[s.i - 1] end,
         p.steps[s.i],
         'Demo history',
         v_admin,
         p.created_at + (p.updated_at - p.created_at) * (s.i::float8 / cardinality(p.steps))
  from paths p
  cross join lateral generate_series(1, cardinality(p.steps)) as s(i);

  insert into public.complaint_assignments (complaint_id, department_id, assigned_by, assigned_at)
  select c.id, d.id, v_admin, c.created_at + (c.updated_at - c.created_at) * 0.5
  from public.complaints c
  join public.departments d on d.department_name = c.department
  where c.is_demo and c.status in ('ASSIGNED','IN_PROGRESS','RESOLVED');

  -- Notifications for the demo users (unread = updated in the last 5 days)
  insert into public.notifications (user_id, complaint_id, title, message, is_read, created_at)
  select c.user_id, c.id,
         'Complaint ' || c.complaint_number || ' updated',
         'Your complaint is now ' || lower(replace(c.status, '_', ' ')) || '.',
         c.updated_at < now() - interval '5 days',
         c.updated_at
  from public.complaints c
  where c.is_demo and c.user_id = v_citizen and c.status <> 'SUBMITTED';

  -- Duplicate relations for the pothole cluster (PENDING admin review)
  select id into v_orig from public.complaints
   where is_demo and title = 'Large pothole on Barakhamba Road near signal';

  insert into public.complaint_relations (complaint_id, related_complaint_id, similarity_score, review_status)
  select c.id, v_orig, x.score, 'PENDING'
  from public.complaints c
  join (values
    ('Deep hole in road, vehicles swerving at the crossing', 0.91),
    ('Road caved in near traffic light',                      0.84),
    ('Please fix this tyre-busting crater',                   0.77)
  ) as x(title, score) on x.title = c.title
  where c.is_demo;

  -- One already-merged pair for the DUPLICATE status
  insert into public.complaint_relations (complaint_id, related_complaint_id, similarity_score, review_status)
  select dup.id, orig.id, 0.86, 'MERGED'
  from public.complaints dup, public.complaints orig
  where dup.is_demo and orig.is_demo
    and dup.title  = 'Garbage pile near Mandi House (second report)'
    and orig.title = 'Garbage dumped on vacant plot';

  update public.complaints set incident_group_id = v_group
   where is_demo and title in ('Garbage pile near Mandi House (second report)', 'Garbage dumped on vacant plot');
end
$seed$;

-- Sanity checks (the dashboard should match these):
-- select status, count(*) from public.complaints where is_demo group by 1 order by 2 desc;
-- select severity, count(*) from public.complaints where is_demo group by 1;
-- select count(*) from public.complaints where is_demo;   -- 27
