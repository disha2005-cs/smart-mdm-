-- PM POSHAN Database Schema Fixes
-- Run this to fix all database schema issues

-- 1. Add missing severity column to alerts table
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS severity VARCHAR DEFAULT 'LOW';

-- 2. Add is_active column to schools table if missing
ALTER TABLE schools ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 3. Standardize attendance status values (PRESENT vs Present)
UPDATE attendances SET status = 'PRESENT' WHERE status = 'Present';
UPDATE attendances SET status = 'ABSENT' WHERE status = 'Absent';

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_date_school ON attendances(date, school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendances(student_id, date);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_inventory_school ON inventory(school_id);

-- 5. Clean up any orphaned records (optional - comment out if you want to keep data)
-- DELETE FROM attendances WHERE student_id NOT IN (SELECT id FROM students);
-- DELETE FROM alerts WHERE school_id NOT IN (SELECT id FROM schools);
-- DELETE FROM inventory WHERE school_id NOT IN (SELECT id FROM schools);

-- 6. Update alert severity for existing alerts
UPDATE alerts SET severity = 'HIGH' WHERE alert_type IN ('LOW_STOCK', 'CRITICAL_SHORTAGE');
UPDATE alerts SET severity = 'MEDIUM' WHERE alert_type IN ('INSPECTION', 'MAINTENANCE');
UPDATE alerts SET severity = 'LOW' WHERE alert_type IN ('HEALTH', 'INFO', 'NOTIFICATION');

SELECT 'Database schema fixes applied successfully!' AS message;
