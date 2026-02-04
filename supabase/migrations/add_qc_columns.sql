-- =============================================
-- Migration: Add QC columns to participants table
-- =============================================
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
-- =============================================

-- Add QC columns
ALTER TABLE participants
ADD COLUMN IF NOT EXISTS qc_status TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS qc_checked_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS qc_notes TEXT NULL,
ADD COLUMN IF NOT EXISTS qc_replaced_count INT NOT NULL DEFAULT 0;

-- Add constraint for valid qc_status values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'qc_status_check'
    ) THEN
        ALTER TABLE participants
        ADD CONSTRAINT qc_status_check CHECK (qc_status IN ('pending', 'approved', 'needs_fix'));
    END IF;
END $$;

-- Verify migration
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'participants' 
AND column_name LIKE 'qc_%';
