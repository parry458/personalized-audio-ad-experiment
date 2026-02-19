
-- Drop the existing constraint
ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_audio_status_check;

-- Re-add with new allowed values
ALTER TABLE participants
ADD CONSTRAINT participants_audio_status_check
CHECK (audio_status IN ('pending', 'generated', 'error', 'under_review', 'ready'));
