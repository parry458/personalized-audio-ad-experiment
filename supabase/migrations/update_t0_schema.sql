-- =============================================
-- Migration: Update T0 Schema and Conditions
-- =============================================

-- 1. Update 'condition' check constraint to allow 'high_a' and 'high_b'
--    Note: We have to drop the old constraint and add a new one.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'participants_condition_check'
    ) THEN
        ALTER TABLE participants DROP CONSTRAINT participants_condition_check;
    END IF;

    -- Also drop the one we might have created via previous migrations if named differently
    -- (Best effort cleanup)
END $$;

ALTER TABLE participants
ADD CONSTRAINT participants_condition_check 
CHECK (condition IN ('low', 'medium', 'high_a', 'high_b'));

-- 2. Add T0 Required Fields
ALTER TABLE participants
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS age INT,
ADD COLUMN IF NOT EXISTS age_range TEXT,
ADD COLUMN IF NOT EXISTS past_category TEXT,
ADD COLUMN IF NOT EXISTS goal_category TEXT;

-- 3. Add Distractor & Other Fields
ALTER TABLE participants
ADD COLUMN IF NOT EXISTS podcast_frequency TEXT,
ADD COLUMN IF NOT EXISTS podcast_genres TEXT[], -- Array of strings
ADD COLUMN IF NOT EXISTS shortform_frequency TEXT,
ADD COLUMN IF NOT EXISTS favorite_movie_genre TEXT,
ADD COLUMN IF NOT EXISTS streaming_services TEXT[], -- Array of strings
ADD COLUMN IF NOT EXISTS devices TEXT[], -- Array of strings
ADD COLUMN IF NOT EXISTS notifications_per_day TEXT,
ADD COLUMN IF NOT EXISTS busy_challenge TEXT,
ADD COLUMN IF NOT EXISTS attention_check_pass BOOLEAN DEFAULT FALSE;

ADD COLUMN IF NOT EXISTS stimulus_text TEXT;

-- 4. Status Column (Ensure it exists and has correct values)
-- We'll assume the status column already exists, but let's ensure the check constraint includes 'screened_out'
-- or we can just use text. Let's add 'screened_out' to the allowed statuses if we have a constraint.

DO $$
BEGIN
    -- Check if there's a constraint on 'status' and update it if necessary
    -- For simplicity in this migration, we'll assume 'status' is TEXT. 
    -- If you are enforcing an ENUM or Check Constraint for status, run this:
    /*
    ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_status_check;
    ALTER TABLE participants ADD CONSTRAINT participants_status_check 
    CHECK (status IN ('pending', 'under_review', 'ready', 'error', 'screened_out'));
    */
    -- For now, just ensuring the column exists is enough as per previous schema knowledge.
END $$;
