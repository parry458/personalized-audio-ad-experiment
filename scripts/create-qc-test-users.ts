
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';


config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Creating QC test participants...');

    const pidMedium = `qc_test_medium_${Date.now()}`;
    const pidHighA = `qc_test_high_a_${Date.now()}`;

    const participants = [
        {
            prolific_pid: pidMedium,
            condition: 'medium',
            audio_status: 'pending', // Pending generation
            age: 25,
            age_range: '25-34',
            city: 'Berlin',
            country: 'Germany',
            past_category: 'Gaming',
            goal_category: 'Work productivity / getting tasks done'
        },
        {
            prolific_pid: pidHighA,
            condition: 'high_a',
            audio_status: 'pending',
            age: 30,
            age_range: '25-34',
            city: 'Paris',
            country: 'France',
            past_category: 'Social media scrolling',
            goal_category: 'Health routine (sleep, exercise, habits)'
        }
    ];

    const { data, error } = await supabase
        .from('participants')
        .insert(participants)
        .select();

    if (error) {
        console.error('Error creating participants:', error);
    } else {
        console.log(`Created ${data.length} participants: ${pidMedium}, ${pidHighA}`);
    }
}

main();
