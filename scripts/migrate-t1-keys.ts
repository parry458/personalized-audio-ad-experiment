/**
 * Migration Script: Normalize T1 Response Keys
 * ============================================
 * 
 * Fetches all T1 responses from the DB and normalizes old keys to new keys
 * using the helper function in src/lib/t1-keys.ts.
 * 
 * Run with: npx ts-node scripts/migrate-t1-keys.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { normalizeT1Answers } from '../src/lib/t1-keys';

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase keys in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('🔄 Starting T1 keys migration...');

    try {
        // Fetch all responses from responses_t1 table
        const { data: responses, error } = await supabase
            .from('responses_t1')
            .select('prolific_pid, response_payload');

        if (error) {
            throw error;
        }

        if (!responses || responses.length === 0) {
            console.log('✅ No T1 responses found to migrate.');
            return;
        }

        console.log(`📊 Found ${responses.length} responses. Normalizing keys...`);

        let updatedCount = 0;

        for (const response of responses) {
            const payload = response.response_payload as any;

            if (!payload || !payload.answers) continue;

            const oldAnswersStr = JSON.stringify(payload.answers);
            const normalizedAnswers = normalizeT1Answers(payload.answers);
            const newAnswersStr = JSON.stringify(normalizedAnswers);

            // Only update if changes were made
            if (oldAnswersStr !== newAnswersStr) {
                payload.answers = normalizedAnswers;

                const { error: updateError } = await supabase
                    .from('responses_t1')
                    .update({ response_payload: payload })
                    .eq('prolific_pid', response.prolific_pid);

                if (updateError) {
                    console.error(`❌ Failed to update PID ${response.prolific_pid}:`, updateError.message);
                } else {
                    console.log(`✅ Updated PID ${response.prolific_pid}`);
                    updatedCount++;
                }
            }
        }

        console.log(`🎉 Migration complete. Updated ${updatedCount} out of ${responses.length} responses.`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
}

runMigration();
