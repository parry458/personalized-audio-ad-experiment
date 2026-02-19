
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Checking for stimulus_text column...');
    // We'll try to select it. If it fails, it doesn't exist.
    const { data, error } = await supabase
        .from('participants')
        .select('stimulus_text')
        .limit(1);

    if (error) {
        if (error.message.includes('does not exist')) {
            console.log('❌ stimulus_text column does NOT exist.');
        } else {
            console.error('Error checking column:', error);
        }
    } else {
        console.log('✅ stimulus_text column exists.');
    }
}

main();
