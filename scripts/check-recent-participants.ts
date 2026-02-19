
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Checking recent participants...');
    const { data, error } = await supabase
        .from('participants')
        .select('prolific_pid, age, age_range, condition, audio_status, qc_status, stimulus_text, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching participants:', error);
        return;
    }

    console.table(data);
}

main();
