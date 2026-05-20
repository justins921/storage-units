-- SQL equivalent of seeds/run.ts for the Chandler client. Lets you bootstrap
-- a deployment from the Supabase SQL editor without installing Node locally.
-- Re-running is safe: every write is conflict-aware.
--
-- Run AFTER all three migrations have run. Run BEFORE you create the manager
-- auth user.

do $$
declare
  v_facility_id  uuid;
  v_type_5x5     uuid;
  v_type_10x10   uuid;
  v_type_10x20   uuid;
begin

  -- ----- facility -----------------------------------------------------------
  insert into facilities (org_id, slug, name, branding_json)
  values (
    '00000000-0000-0000-0000-00000000c001',
    'allseasons',
    'All Seasons Storage',
    jsonb_build_object(
      'hero_title',    'Climate-controlled storage in Chandler',
      'hero_subtitle', 'Drive-up access, 24/7 gate, month-to-month leases. Reserve online in under 2 minutes.',
      'primary_color', '#0f4c81'
    )
  )
  on conflict (slug) do update
    set name = excluded.name,
        branding_json = excluded.branding_json,
        org_id = excluded.org_id,
        updated_at = now()
  returning id into v_facility_id;

  -- ----- unit_types ---------------------------------------------------------
  insert into unit_types (facility_id, name, width_ft, length_ft, features, monthly_rate_cents, description)
  values (v_facility_id, '5x5', 5, 5, array['ground floor'], 4900,
          'A small closet — fits a few boxes and a bike.')
  on conflict (facility_id, name) do update
    set width_ft = excluded.width_ft,
        length_ft = excluded.length_ft,
        features = excluded.features,
        monthly_rate_cents = excluded.monthly_rate_cents,
        description = excluded.description
  returning id into v_type_5x5;

  insert into unit_types (facility_id, name, width_ft, length_ft, features, monthly_rate_cents, description)
  values (v_facility_id, '10x10', 10, 10, array['drive-up','ground floor'], 12900,
          'A bedroom of furniture, comfortably.')
  on conflict (facility_id, name) do update
    set width_ft = excluded.width_ft,
        length_ft = excluded.length_ft,
        features = excluded.features,
        monthly_rate_cents = excluded.monthly_rate_cents,
        description = excluded.description
  returning id into v_type_10x10;

  insert into unit_types (facility_id, name, width_ft, length_ft, features, monthly_rate_cents, description)
  values (v_facility_id, '10x20 climate', 10, 20, array['climate','drive-up'], 22900,
          'A 1-bedroom apartment, climate-controlled.')
  on conflict (facility_id, name) do update
    set width_ft = excluded.width_ft,
        length_ft = excluded.length_ft,
        features = excluded.features,
        monthly_rate_cents = excluded.monthly_rate_cents,
        description = excluded.description
  returning id into v_type_10x20;

  -- ----- units --------------------------------------------------------------
  insert into units (facility_id, unit_type_id, label, status, monthly_rate_cents)
  select v_facility_id, v_type_5x5, label, 'available', 4900
    from unnest(array['A1','A2','A3','A4']) as label
  on conflict (facility_id, label) do update
    set unit_type_id = excluded.unit_type_id,
        monthly_rate_cents = excluded.monthly_rate_cents;

  insert into units (facility_id, unit_type_id, label, status, monthly_rate_cents)
  select v_facility_id, v_type_10x10, label, 'available', 12900
    from unnest(array['B1','B2','B3','B4','B5','B6']) as label
  on conflict (facility_id, label) do update
    set unit_type_id = excluded.unit_type_id,
        monthly_rate_cents = excluded.monthly_rate_cents;

  insert into units (facility_id, unit_type_id, label, status, monthly_rate_cents)
  select v_facility_id, v_type_10x20, label, 'available', 22900
    from unnest(array['C1','C2','C3']) as label
  on conflict (facility_id, label) do update
    set unit_type_id = excluded.unit_type_id,
        monthly_rate_cents = excluded.monthly_rate_cents;

  -- ----- default dunning templates ------------------------------------------
  insert into sms_templates (facility_id, key, body)
  values
    (v_facility_id, 'dunning_day_3',  'Hi {first_name}, your storage payment is 3 days late. Pay now to avoid late fees: {portal_url}'),
    (v_facility_id, 'dunning_day_5',  'Reminder: your {facility_name} payment is 5 days late. Pay here: {portal_url}'),
    (v_facility_id, 'dunning_day_7',  'Your storage unit is past due. Pay within 3 days to keep your unit: {portal_url}'),
    (v_facility_id, 'dunning_day_10', 'Your unit is at risk of lien proceedings. Please pay immediately: {portal_url}'),
    (v_facility_id, 'dunning_day_14', 'Final notice. Lien process begins in 48h. {portal_url}')
  on conflict (facility_id, key) do nothing;

end $$;

-- ---------------------------------------------------------------------------
-- After running this file, create your manager:
--
--   1. Supabase dashboard → Authentication → Users → Add user
--      (set email + password, check "Auto Confirm User").
--   2. Click the new user, copy their UID.
--   3. Run this, pasting the UID and email:
--
-- insert into managers (id, email, facility_access)
-- select '<paste-uid>'::uuid,
--        '<paste-email>',
--        array(select id from facilities)
-- on conflict (id) do update
--   set email = excluded.email,
--       facility_access = excluded.facility_access;
-- ---------------------------------------------------------------------------
