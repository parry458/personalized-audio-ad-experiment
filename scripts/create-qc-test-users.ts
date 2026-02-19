
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
        },
        {
            prolific_pid: `qc_test_high_b_${Date.now()}`,
            condition: 'high_b',
            audio_status: 'pending',
            age: 40,
            age_range: '35-44',
            city: 'London',
            country: 'UK',
            past_category: 'Streaming videos/TV',
            goal_category: 'Job search / applications / career planning'
        },
        {
            prolific_pid: `qc_test_low_${Date.now()}`,
            condition: 'low',
            audio_status: 'pending',
            age: 20,
            age_range: '18-24',
            city: 'New York',
            country: 'USA',
            // Low doesn't use these but good to have
            past_category: 'Gaming',
            goal_category: 'Other'
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
