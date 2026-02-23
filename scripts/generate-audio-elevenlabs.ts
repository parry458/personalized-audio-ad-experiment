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
import { stitchWithPodcast } from '../src/lib/audio-stitch';

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

    // Check if low_final.mp3 already exists in storage (idempotent)
    const { data: existing } = await supabase.storage
        .from('ads-audio')
        .createSignedUrl('low_final.mp3', 10);

    if (existing?.signedUrl) {
        console.log('  ✅ low_final.mp3 already exists in storage — skipping generation');
    } else {
        // Generate, stitch, and upload
        console.log('  🎙️  Generating low ad via ElevenLabs...');
        try {
            const audioBuffer = await generateAudio(lowText, elevenLabsKey!);
            console.log('  🎧 Stitching with podcast intro/outro...');
            const stitchedBuffer = await stitchWithPodcast(audioBuffer, 'low_final.mp3');
            await uploadAudio('low_final.mp3', stitchedBuffer);
            console.log('  ✅ low_final.mp3 uploaded');
        } catch (error) {
            console.error('  ❌ Failed to generate/upload low_final.mp3:', error);
            return 0;
        }
    }

    // Update ALL pending LOW participants
    const { data: updated, error } = await supabase
        .from('participants')
        .update({
            audio_status: 'ready',
            audio_path: 'low_final.mp3',
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
// PROCESS NON-LOW CONDITIONS (UNIFIED)
// ============================================
// Handles both first-time generation (pending) and
// re-generation (needs_fix) in a single pass.

import { getStimulusText } from '../src/lib/stimulus-generator';

async function processNonLowConditions(): Promise<{ generated: number; regenerated: number; errors: number }> {
    console.log('\n📢 Processing non-LOW conditions (pending + needs_fix)...');

    // Single query: pick up both pending and needs_fix
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
            audio_status,
            regen_count,
            stimulus_text
        `)
        .in('condition', ['medium', 'high_a', 'high_b'])
        .in('audio_status', ['pending', 'needs_fix'])
        .limit(BATCH_SIZE);

    if (error) {
        console.error('  ❌ Failed to fetch participants:', error.message);
        return { generated: 0, regenerated: 0, errors: 0 };
    }

    if (!participants || participants.length === 0) {
        console.log('  ✅ No pending or needs_fix participants');
        return { generated: 0, regenerated: 0, errors: 0 };
    }

    const pendingCount = participants.filter(p => p.audio_status === 'pending').length;
    const needsFixCount = participants.filter(p => p.audio_status === 'needs_fix').length;
    console.log(`  📋 Found ${participants.length} participants (${pendingCount} pending, ${needsFixCount} needs_fix)`);

    let generated = 0;
    let regenerated = 0;
    let errors = 0;

    for (const p of participants) {
        const isRegen = p.audio_status === 'needs_fix';
        const currentRegenCount = p.regen_count || 0;

        // Determine file path
        // First-gen: pid_condition_final.mp3
        // Re-gen:    pid_condition_v<N>_final.mp3
        const audioPath = isRegen
            ? `${p.prolific_pid}_${p.condition}_v${currentRegenCount + 1}_final.mp3`
            : `${p.prolific_pid}_${p.condition}_final.mp3`;

        try {
            const label = isRegen ? '🔄 Re-generating' : '👤 Generating';
            console.log(`  ${label} ${p.prolific_pid} (${p.condition})${isRegen ? ` → v${currentRegenCount + 1}` : ''}...`);

            // 1. Generate stimulus text (always fresh for regen, reuse if exists for first-gen)
            let finalStimulusText: string;

            if (!isRegen && p.stimulus_text) {
                console.log(`     ✅ Using existing stimulus text`);
                finalStimulusText = p.stimulus_text;
            } else {
                console.log(`     📝 Generating stimulus text...`);
                finalStimulusText = getStimulusText({
                    condition: p.condition as 'medium' | 'high_a' | 'high_b',
                    city: p.city,
                    age: p.age,
                    age_range: p.age_range,
                    country: p.country,
                    past_category: p.past_category,
                    goal_category: p.goal_category
                });

                if (!finalStimulusText) {
                    throw new Error('Failed to generate stimulus text');
                }
            }

            // 2. Generate Audio via ElevenLabs
            console.log(`     🎙️  Generating audio via ElevenLabs...`);
            const audioBuffer = await generateAudio(finalStimulusText, elevenLabsKey!);

            // 3. Stitch with podcast intro/outro
            console.log(`     🎧 Stitching with podcast intro/outro...`);
            const stitchedBuffer = await stitchWithPodcast(audioBuffer, audioPath);

            // 4. Upload stitched audio
            console.log(`     ⬆️  Uploading: ${audioPath}...`);
            await uploadAudio(audioPath, stitchedBuffer);

            // 5. Update participant record
            // First-gen → under_review (first check)
            // Re-gen   → awaiting_second_check
            const newStatus = isRegen ? 'awaiting_second_check' : 'under_review';

            const updatePayload: Record<string, unknown> = {
                stimulus_text: finalStimulusText,
                audio_status: newStatus,
                qc_status: newStatus,
                audio_path: audioPath,
                audio_generated_at: new Date().toISOString(),
                audio_error: null,
            };

            // Only increment regen_count for re-generations
            if (isRegen) {
                updatePayload.regen_count = currentRegenCount + 1;
            }

            await supabase
                .from('participants')
                .update(updatePayload)
                .eq('prolific_pid', p.prolific_pid);

            console.log(`     ✅ Complete!`);
            if (isRegen) regenerated++;
            else generated++;

        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            console.error(`  ❌ ${p.prolific_pid}: ${errorMsg}`);

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

    return { generated, regenerated, errors };
}

// ============================================
// MAIN
// ============================================

async function main() {
    console.log('🚀 ElevenLabs Audio Generation Script');
    console.log('=====================================');

    const lowUpdated = await processLowCondition();
    const { generated, regenerated, errors } = await processNonLowConditions();

    console.log('\n=====================================');
    console.log('📊 Summary:');
    console.log(`   LOW updated:    ${lowUpdated}`);
    console.log(`   Generated:      ${generated}`);
    console.log(`   Regenerated:    ${regenerated}`);
    console.log(`   Errors:         ${errors}`);
    console.log('=====================================\n');
}

main().catch(err => {
    console.error('❌ Script failed:', err);
    process.exit(1);
});
