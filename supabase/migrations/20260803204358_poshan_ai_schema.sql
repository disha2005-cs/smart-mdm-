/*
# Poshan AI - Smart Mid-Day Meal Management Schema

1. New Tables
- `schools` — schools participating in the mid-day meal program (udise code, name, location, principal, contact, status)
- `students` — students enrolled at a school (name, grade, section, gender, dob, parent contact, allergies, dietary prefs, active)
- `inventory_items` — kitchen stock per school (item name, category, quantity, unit, threshold, supplier, cost per unit)
- `alerts` — notifications per school (type, message, status: UNREAD/READ)
- `daily_meals` — daily meal consumption records per school (date, students present, rice/wheat/dal consumed)

2. Security
- Single-tenant demo app (no sign-in screen). RLS enabled on every table.
- All tables allow anon + authenticated CRUD since data is intentionally shared/public for this management demo.
- `USING (true)` / `WITH CHECK (true)` is documented as intentional public/shared data.

3. Relationships
- students.school_id -> schools.id (CASCADE)
- inventory_items.school_id -> schools.id (CASCADE)
- alerts.school_id -> schools.id (CASCADE)
- daily_meals.school_id -> schools.id (CASCADE)

4. Notes
- Uses gen_random_uuid() for primary keys.
- Timestamps with timezone defaults.
- Idempotent: safe to re-run.
*/

CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  udise_code text UNIQUE NOT NULL,
  school_name text NOT NULL,
  district text NOT NULL,
  taluk text NOT NULL,
  village text NOT NULL,
  address text,
  pin_code text,
  principal_name text,
  principal_phone text,
  email text,
  phone text,
  latitude float8,
  longitude float8,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text UNIQUE NOT NULL,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date,
  gender text,
  grade text,
  section text,
  parent_name text,
  parent_phone text,
  has_allergies boolean DEFAULT false,
  dietary_preferences text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  quantity float8 NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'kg',
  threshold float8 NOT NULL DEFAULT 10,
  supplier text,
  cost_per_unit float8,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'UNREAD',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  total_students_present int DEFAULT 0,
  rice_consumed float8 DEFAULT 0,
  wheat_consumed float8 DEFAULT 0,
  dal_consumed float8 DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_inventory_school_id ON inventory_items(school_id);
CREATE INDEX IF NOT EXISTS idx_alerts_school_id ON alerts(school_id);
CREATE INDEX IF NOT EXISTS idx_daily_meals_school_id ON daily_meals(school_id);
CREATE INDEX IF NOT EXISTS idx_daily_meals_date ON daily_meals(date);

-- Enable RLS on all tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_meals ENABLE ROW LEVEL SECURITY;

-- Schools policies (public/shared demo data)
DROP POLICY IF EXISTS "anon_select_schools" ON schools;
CREATE POLICY "anon_select_schools" ON schools FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_schools" ON schools;
CREATE POLICY "anon_insert_schools" ON schools FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_schools" ON schools;
CREATE POLICY "anon_update_schools" ON schools FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_schools" ON schools;
CREATE POLICY "anon_delete_schools" ON schools FOR DELETE TO anon, authenticated USING (true);

-- Students policies
DROP POLICY IF EXISTS "anon_select_students" ON students;
CREATE POLICY "anon_select_students" ON students FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_students" ON students;
CREATE POLICY "anon_insert_students" ON students FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_students" ON students;
CREATE POLICY "anon_update_students" ON students FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_students" ON students;
CREATE POLICY "anon_delete_students" ON students FOR DELETE TO anon, authenticated USING (true);

-- Inventory policies
DROP POLICY IF EXISTS "anon_select_inventory" ON inventory_items;
CREATE POLICY "anon_select_inventory" ON inventory_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_inventory" ON inventory_items;
CREATE POLICY "anon_insert_inventory" ON inventory_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_inventory" ON inventory_items;
CREATE POLICY "anon_update_inventory" ON inventory_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_inventory" ON inventory_items;
CREATE POLICY "anon_delete_inventory" ON inventory_items FOR DELETE TO anon, authenticated USING (true);

-- Alerts policies
DROP POLICY IF EXISTS "anon_select_alerts" ON alerts;
CREATE POLICY "anon_select_alerts" ON alerts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_alerts" ON alerts;
CREATE POLICY "anon_insert_alerts" ON alerts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_alerts" ON alerts;
CREATE POLICY "anon_update_alerts" ON alerts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_alerts" ON alerts;
CREATE POLICY "anon_delete_alerts" ON alerts FOR DELETE TO anon, authenticated USING (true);

-- Daily meals policies
DROP POLICY IF EXISTS "anon_select_daily_meals" ON daily_meals;
CREATE POLICY "anon_select_daily_meals" ON daily_meals FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_daily_meals" ON daily_meals;
CREATE POLICY "anon_insert_daily_meals" ON daily_meals FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_daily_meals" ON daily_meals;
CREATE POLICY "anon_update_daily_meals" ON daily_meals FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_daily_meals" ON daily_meals;
CREATE POLICY "anon_delete_daily_meals" ON daily_meals FOR DELETE TO anon, authenticated USING (true);
