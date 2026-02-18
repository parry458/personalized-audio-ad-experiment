
import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';

async function checkMoreColumns() {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Try to select 'qc_status' and 'audio_path'
    const { data, error } = await supabase
        .from('participants')
        .select('qc_status, audio_path')
        .limit(1);

    if (error) {
        console.error('❌ Error selecting columns:', error.message);
    } else {
        console.log('✅ qc_status and audio_path exist.');
    }
}

checkMoreColumns();
