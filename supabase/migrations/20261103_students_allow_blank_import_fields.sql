-- Bulk upload keeps a blank cell blank instead of inventing a value (School ID, DOB 2015-01-01,
-- father "N/A", class V, roll 1). These columns therefore have to accept NULL; the app flags
-- students with missing essentials instead.
alter table public.students
  alter column school_id drop not null,
  alter column dob drop not null,
  alter column gender drop not null,
  alter column father_name drop not null,
  alter column mother_name drop not null,
  alter column present_class drop not null,
  alter column present_section drop not null,
  alter column present_roll drop not null;
