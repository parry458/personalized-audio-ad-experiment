
import { config } from 'dotenv';
import path from 'path';

// Load .env.local from project root
config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

async function verify() {
    console.log('🔍 Verifying setup...');

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
        process.exit(1);
    }

    console.log(`✅ Environment variables found`);

    try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Try to connect to Supabase
        const { count, error } = await supabase
            .from('participants')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Supabase connection failed:', error.message);
            process.exit(1);
        }

        console.log(`✅ Supabase connection successful! (Participants table accessible)`);

    } catch (err: any) {
        console.error('❌ Unexpected error:', err.message);
        process.exit(1);
    }
}

verify();
