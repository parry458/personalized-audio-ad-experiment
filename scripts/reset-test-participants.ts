
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Resetting test participants to pending...');

    // Reset specific test users
    const { data, error } = await supabase
        .from('participants')
        .update({
            audio_status: 'pending',
            qc_status: 'pending', // Ensure this is reset too
            audio_path: null,
            audio_error: null
        })
        .in('prolific_pid', [
            'generation_test_8',
            'test_user_age44_1771496591680',
            'test_ui_refactor'
        ])
        .select();

    if (error) {
        console.error('Error resetting:', error);
    } else {
        console.log(`Reset ${data.length} participants.`);
    }
}

main();
