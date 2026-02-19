/**
 * ElevenLabs Audio Generation Script
 * ===================================
 * 
 * Generates MP3 audio ads using ElevenLabs TTS API and uploads to Supabase Storage.
 * 
 * Usage: npm run generate-audio
 * 
 * Environment variables required:
 *   - ELEVENLABS_API_KEY
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURATION
// ============================================

const BATCH_SIZE = 50; // Max participants per run

// ============================================
// SUPABASE CLIENT
// ============================================

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

if (!elevenLabsKey) {
    console.error('❌ Missing ELEVENLABS_API_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// SHARED AUDIO GENERATOR
// ============================================

import { generateAudio, uploadAudio } from '../src/lib/audio-generator';

// ============================================
// PROCESS LOW CONDITION (SHARED FILE)
// ============================================

// ============================================
// PROCESS LOW CONDITION (SHARED FILE)
// ============================================

async function processLowCondition(): Promise<number> {
    console.log('\n📢 Processing LOW condition (shared file)...');

    // Generate the LOW text dynamically (no placeholders)
    const lowText = getStimulusText({
        condition: 'low',
        city: '',
        age: 0,
        age_range: '',
        country: '',
        past_category: '',
        goal_category: ''
    });

    // Always regenerate to ensure latest text version
    console.log('  🎙️  Generating low.mp3...');
    try {
        const audioBuffer = await generateAudio(lowText, elevenLabsKey!);
        await uploadAudio('low.mp3', audioBuffer);
        console.log('  ✅ low.mp3 uploaded');
    } catch (error) {
        console.error('  ❌ Failed to generate/upload low.mp3:', error);
        return 0;
    }

    // Update ALL pending LOW participants
    const { data: updated, error } = await supabase
        .from('participants')
        .update({
            audio_status: 'ready',
            audio_path: 'low.mp3',
            stimulus_text: lowText,
            qc_status: 'approved',
            audio_generated_at: new Date().toISOString(),
            audio_error: null,
        })
        .eq('condition', 'low')
        .eq('audio_status', 'pending')
        .select('prolific_pid');

    if (error) {
        console.error('  ❌ Failed to update LOW participants:', error.message);
        return 0;
    }

    const count = updated?.length || 0;
    console.log(`  📊 Updated ${count} LOW participants`);
    return count;
}

// ============================================
// PROCESS MEDIUM/HIGH CONDITIONS (INDIVIDUAL FILES)
// ============================================

import { getStimulusText } from '../src/lib/stimulus-generator';

async function processMediumHighConditions(): Promise<{ generated: number; errors: number }> {
    console.log('\n📢 Processing MEDIUM/HIGH conditions...');

    // Fetch pending participants with ALL necessary fields for generation
    const { data: participants, error } = await supabase
        .from('participants')
        .select(`
            prolific_pid, 
            condition, 
            city, 
            age, 
            age_range, 
            country, 
            past_category, 
            goal_category,
            stimulus_text
        `)
        .in('condition', ['medium', 'high_a', 'high_b']) // Updated to include high_a/high_b explicitly
        .eq('audio_status', 'pending')
        .limit(BATCH_SIZE);

    if (error) {
        console.error('  ❌ Failed to fetch participants:', error.message);
        return { generated: 0, errors: 0 };
    }

    if (!participants || participants.length === 0) {
        console.log('  ✅ No pending MEDIUM/HIGH participants');
        return { generated: 0, errors: 0 };
    }

    console.log(`  📋 Found ${participants.length} pending participants`);

    let generated = 0;
    let errors = 0;

    for (const p of participants) {
        // Deterministic file naming: {pid}_{condition}.mp3
        const audioPath = `${p.prolific_pid}_${p.condition}.mp3`;

        try {
            console.log(`  👤 Processing ${p.prolific_pid} (${p.condition})...`);

            // 1. Determine Stimulus Text
            let finalStimulusText = p.stimulus_text;

            if (!finalStimulusText) {
                console.log(`     📝 Generating stimulus text...`);
                // Generate if missing
                finalStimulusText = getStimulusText({
                    condition: p.condition as 'medium' | 'high_a' | 'high_b',
                    city: p.city,
                    age: p.age,
                    age_range: p.age_range,
                    country: p.country,
                    past_category: p.past_category,
                    goal_category: p.goal_category
                });

                // Verify generation
                if (!finalStimulusText) {
                    throw new Error("Failed to generate stimulus text.");
                }

                // Store it first (QC traceability)
                const { error: updateError } = await supabase
                    .from('participants')
                    .update({ stimulus_text: finalStimulusText })
                    .eq('prolific_pid', p.prolific_pid);

                if (updateError) {
                    throw new Error(`Failed to save stimulus text: ${updateError.message}`);
                }
                console.log(`     💾 Stimulus text saved`);
            } else {
                console.log(`     ✅ Using existing stimulus text`);
            }

            // 2. Generate Audio
            console.log(`     🎙️  Generating audio via ElevenLabs...`);
            const audioBuffer = await generateAudio(finalStimulusText, elevenLabsKey!);

            // 3. Upload Audio
            console.log(`     ⬆️  Uploading to storage: ${audioPath}...`);
            await uploadAudio(audioPath, audioBuffer);

            // 4. Update Participant Status
            const updatePayload: any = {
                audio_status: 'under_review', // Requires QC
                qc_status: 'pending',
                audio_path: audioPath,
                audio_generated_at: new Date().toISOString(),
                audio_error: null,
            };

            await supabase
                .from('participants')
                .update(updatePayload)
                .eq('prolific_pid', p.prolific_pid);

            console.log(`     ✅ Complete!`);
            generated++;

        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            console.error(`  ❌ ${p.prolific_pid}: ${errorMsg}`);

            // Mark as error
            await supabase
                .from('participants')
                .update({
                    audio_status: 'error',
                    audio_error: errorMsg.slice(0, 500),
                })
                .eq('prolific_pid', p.prolific_pid);

            errors++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    return { generated, errors };
}

// ============================================
// MAIN
// ============================================

async function main() {
    console.log('🚀 ElevenLabs Audio Generation Script');
    console.log('=====================================');

    const lowUpdated = await processLowCondition();
    const { generated, errors } = await processMediumHighConditions();

    console.log('\n=====================================');
    console.log('📊 Summary:');
    console.log(`   LOW updated:    ${lowUpdated}`);
    console.log(`   MEDIUM/HIGH:    ${generated} generated, ${errors} errors`);
    console.log('=====================================\n');
}

main().catch(err => {
    console.error('❌ Script failed:', err);
    process.exit(1);
});
