
import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';

async function checkColumns() {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Try to select 'status' from participants
    const { data, error } = await supabase
        .from('participants')
        .select('status')
        .limit(1);

    if (error) {
        console.error('❌ Error selecting status:', error.message);
        // If error is "column does not exist", we know it's missing.
    } else {
        console.log('✅ Status column exists.');
    }
}

checkColumns();
