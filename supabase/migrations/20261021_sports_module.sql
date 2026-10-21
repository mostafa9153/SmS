-- ============================================================
-- Migration: Sports & Athletics Management System
-- Date: 2026-10-21
--
-- Tables:
-- 1. sports_events: Preloaded and custom athletic games/events
-- 2. sports_athletes: Universal meet-wide chest/bib numbers
-- 3. sports_event_registrations: Student-to-event enrollments
-- 4. sports_event_results: Ground referee scores, trials & 1st/2nd/3rd ranks
-- ============================================================

-- 1. Sports Events Table
CREATE TABLE IF NOT EXISTS public.sports_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'Track', -- 'Track', 'Field', 'Fun', 'Team'
  gender VARCHAR(20) NOT NULL DEFAULT 'All',     -- 'Boys', 'Girls', 'All'
  eligible_classes TEXT[] NOT NULL DEFAULT '{}', -- e.g. '{"V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"}'
  scoring_type VARCHAR(30) NOT NULL DEFAULT 'Metric', -- 'Metric' (trial/time/distance) or 'Rank_Only' (1st/2nd/3rd only)
  measurement_unit VARCHAR(30) DEFAULT 'Time (s)', -- 'Time (s)', 'Distance (m)', 'Height (m)', 'Points', 'None'
  max_participants INT DEFAULT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Sports Athletes (Universal Chest Number Registry)
CREATE TABLE IF NOT EXISTS public.sports_athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  chest_number VARCHAR(30) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sports_chest_year UNIQUE (academic_year, chest_number),
  CONSTRAINT uq_sports_student_year UNIQUE (academic_year, student_id)
);

-- 3. Event Registrations (Enrollments)
CREATE TABLE IF NOT EXISTS public.sports_event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.sports_events(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES public.sports_athletes(id) ON DELETE SET NULL,
  lane_or_heat VARCHAR(30),
  status VARCHAR(20) NOT NULL DEFAULT 'Registered', -- 'Registered', 'Disqualified', 'DNS'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sports_event_student UNIQUE (event_id, student_id)
);

-- 4. Event Results (Trials, Best Score, and Rank)
CREATE TABLE IF NOT EXISTS public.sports_event_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.sports_events(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  trial_1 VARCHAR(50),
  trial_2 VARCHAR(50),
  trial_3 VARCHAR(50),
  best_score VARCHAR(50),
  rank_position INT, -- 1 = 1st, 2 = 2nd, 3 = 3rd
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sports_event_result_student UNIQUE (event_id, student_id)
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_sports_events_year ON public.sports_events(academic_year);
CREATE INDEX IF NOT EXISTS idx_sports_athletes_stud ON public.sports_athletes(student_id);
CREATE INDEX IF NOT EXISTS idx_sports_athletes_chest ON public.sports_athletes(chest_number);
CREATE INDEX IF NOT EXISTS idx_sports_reg_event ON public.sports_event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_sports_reg_student ON public.sports_event_registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_sports_results_event ON public.sports_event_results(event_id);
CREATE INDEX IF NOT EXISTS idx_sports_results_rank ON public.sports_event_results(event_id, rank_position);

-- Enable RLS
ALTER TABLE public.sports_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_event_results ENABLE ROW LEVEL SECURITY;

-- Permissive policies for authenticated users & anon read (with DROP IF EXISTS for safe re-runs)
DROP POLICY IF EXISTS "Allow read sports_events" ON public.sports_events;
CREATE POLICY "Allow read sports_events" ON public.sports_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write sports_events" ON public.sports_events;
CREATE POLICY "Allow write sports_events" ON public.sports_events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read sports_athletes" ON public.sports_athletes;
CREATE POLICY "Allow read sports_athletes" ON public.sports_athletes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write sports_athletes" ON public.sports_athletes;
CREATE POLICY "Allow write sports_athletes" ON public.sports_athletes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read sports_registrations" ON public.sports_event_registrations;
CREATE POLICY "Allow read sports_registrations" ON public.sports_event_registrations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write sports_registrations" ON public.sports_event_registrations;
CREATE POLICY "Allow write sports_registrations" ON public.sports_event_registrations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read sports_results" ON public.sports_event_results;
CREATE POLICY "Allow read sports_results" ON public.sports_event_results FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write sports_results" ON public.sports_event_results;
CREATE POLICY "Allow write sports_results" ON public.sports_event_results FOR ALL USING (true) WITH CHECK (true);

-- Seed standard athletic events for current year if empty
INSERT INTO public.sports_events (name, category, gender, eligible_classes, scoring_type, measurement_unit, description)
SELECT '100m Sprint', 'Track', 'All', '{"V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"}', 'Metric', 'Time (s)', 'Standard 100 meters sprint track race'
WHERE NOT EXISTS (SELECT 1 FROM public.sports_events WHERE name = '100m Sprint');

INSERT INTO public.sports_events (name, category, gender, eligible_classes, scoring_type, measurement_unit, description)
SELECT '200m Sprint', 'Track', 'All', '{"V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"}', 'Metric', 'Time (s)', '200 meters sprint race'
WHERE NOT EXISTS (SELECT 1 FROM public.sports_events WHERE name = '200m Sprint');

INSERT INTO public.sports_events (name, category, gender, eligible_classes, scoring_type, measurement_unit, description)
SELECT '400m Race', 'Track', 'All', '{"VII", "VIII", "IX", "X", "XI", "XII"}', 'Metric', 'Time (s)', 'One full lap track race'
WHERE NOT EXISTS (SELECT 1 FROM public.sports_events WHERE name = '400m Race');

INSERT INTO public.sports_events (name, category, gender, eligible_classes, scoring_type, measurement_unit, description)
SELECT 'Long Jump', 'Field', 'All', '{"V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"}', 'Metric', 'Distance (m)', 'Standard sandpit horizontal jump'
WHERE NOT EXISTS (SELECT 1 FROM public.sports_events WHERE name = 'Long Jump');

INSERT INTO public.sports_events (name, category, gender, eligible_classes, scoring_type, measurement_unit, description)
SELECT 'High Jump', 'Field', 'All', '{"VII", "VIII", "IX", "X", "XI", "XII"}', 'Metric', 'Height (m)', 'Vertical bar jump competition'
WHERE NOT EXISTS (SELECT 1 FROM public.sports_events WHERE name = 'High Jump');

INSERT INTO public.sports_events (name, category, gender, eligible_classes, scoring_type, measurement_unit, description)
SELECT 'Shot Put', 'Field', 'All', '{"VII", "VIII", "IX", "X", "XI", "XII"}', 'Metric', 'Distance (m)', 'Heavy spherical ball throw'
WHERE NOT EXISTS (SELECT 1 FROM public.sports_events WHERE name = 'Shot Put');

INSERT INTO public.sports_events (name, category, gender, eligible_classes, scoring_type, measurement_unit, description)
SELECT 'Discus Throw', 'Field', 'All', '{"IX", "X", "XI", "XII"}', 'Metric', 'Distance (m)', 'Heavy disc throw'
WHERE NOT EXISTS (SELECT 1 FROM public.sports_events WHERE name = 'Discus Throw');

INSERT INTO public.sports_events (name, category, gender, eligible_classes, scoring_type, measurement_unit, description)
SELECT '4x100m Relay', 'Track', 'All', '{"V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"}', 'Metric', 'Time (s)', 'Four-athlete baton relay'
WHERE NOT EXISTS (SELECT 1 FROM public.sports_events WHERE name = '4x100m Relay');

INSERT INTO public.sports_events (name, category, gender, eligible_classes, scoring_type, measurement_unit, description)
SELECT 'Sack Race', 'Fun', 'All', '{"V", "VI", "VII", "VIII"}', 'Rank_Only', 'None', 'Fun race in burlap sacks'
WHERE NOT EXISTS (SELECT 1 FROM public.sports_events WHERE name = 'Sack Race');

INSERT INTO public.sports_events (name, category, gender, eligible_classes, scoring_type, measurement_unit, description)
SELECT 'Spoon & Marble Race', 'Fun', 'All', '{"V", "VI", "VII"}', 'Rank_Only', 'None', 'Balancing marble on a spoon held in mouth'
WHERE NOT EXISTS (SELECT 1 FROM public.sports_events WHERE name = 'Spoon & Marble Race');

INSERT INTO public.sports_events (name, category, gender, eligible_classes, scoring_type, measurement_unit, description)
SELECT 'Tug of War', 'Fun', 'All', '{"V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"}', 'Rank_Only', 'None', 'Rope pulling team competition'
WHERE NOT EXISTS (SELECT 1 FROM public.sports_events WHERE name = 'Tug of War');
