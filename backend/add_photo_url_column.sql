-- Add photo_url column to students table for S3 storage
-- Run this on your Neon database

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add comment
COMMENT ON COLUMN students.photo_url IS 'S3 public URL for student photo';
