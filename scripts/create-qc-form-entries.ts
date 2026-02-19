
import { createClient } from '@supabase/supabase-js';

// Config
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log('🚀 Creating 4 QC Participants (One Per Condition)...');

    const timestamp = Date.now();

    const participants = [
        {
            prolific_pid: `qc_final_low_${timestamp}`,
            condition: 'low',
            audio_status: 'pending',
            age: 22,
            age_range: '18-24', // "below 20" or "18-24" depending on input, let's use standard range for now
            city: 'New York',
            country: 'USA',
            past_category: 'Gaming', // Ignored for low but good to have
            goal_category: 'Other'   // Ignored for low
        },
        {
            prolific_pid: `qc_final_medium_${timestamp}`,
            condition: 'medium',
            audio_status: 'pending',
            age: 30,
            age_range: '25-34',
            city: 'Berlin',
            country: 'Germany',
            past_category: 'Social media scrolling',
            goal_category: 'Health routine (sleep, exercise, habits)'
        },
        {
            prolific_pid: `qc_final_high_a_${timestamp}`,
            condition: 'high_a',
            audio_status: 'pending',
            age: 45,
            age_range: '45-54',
            city: 'Paris',
            country: 'France',
            past_category: 'Streaming videos/TV',
            goal_category: 'Learning a language' // Mapped to 'Other' -> 'a personal goal' usually or specific if mapped
        },
        {
            prolific_pid: `qc_final_high_b_${timestamp}`,
            condition: 'high_b',
            audio_status: 'pending',
            age: 38,
            age_range: '35-44',
            city: 'London',
            country: 'UK',
            past_category: 'Online shopping / browsing products',
            goal_category: 'Work productivity / getting tasks done'
        }
    ];

    for (const p of participants) {
        console.log(`   Creating: ${p.prolific_pid} (${p.condition})`);
        const { error } = await supabase.from('participants').insert(p);
        if (error) {
            console.error(`   ❌ Failed to insert ${p.prolific_pid}:`, error.message);
        } else {
            console.log(`   ✅ Inserted`);
        }
    }

    console.log('\n✅ Data setup complete. Run "npm run generate-audio" to process.');
}

main();
