
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
    console.log('🚀 Triggering Single Audio Generation via API...');

    // 1. Create a specific test user
    const pid = `manual_trigger_test_${Date.now()}`;
    console.log(`   Creating test user: ${pid}`);

    const { error } = await supabase.from('participants').insert({
        prolific_pid: pid,
        condition: 'high_a',
        audio_status: 'pending',
        age: 29,
        age_range: '25-34',
        city: 'Tokyo',
        country: 'Japan',
        past_category: 'Gaming',
        goal_category: 'Learning a language'
    });

    if (error) {
        console.error('❌ Failed to create user:', error);
        return;
    }

    // 2. Call the API (simulated fetch since API is local)
    // Actually, we can just run a fetch to localhost:3000 if server is running
    // OR we can just invoke the handler logic if we want to unit test, but integration test is better.
    // Let's assume dev server is running at localhost:3000

    const apiUrl = `http://localhost:3000/api/admin/generate-one?prolific_pid=${pid}`;
    console.log(`   Calling: ${apiUrl}`);

    try {
        const res = await fetch(apiUrl);
        const data = await res.json();

        if (res.ok) {
            console.log('   ✅ API Success:', data);
        } else {
            console.error('   ❌ API Error:', data);
        }
    } catch (err) {
        console.error('   ❌ Fetch failed (is localhost:3000 running?):', err);
    }
}

main();
