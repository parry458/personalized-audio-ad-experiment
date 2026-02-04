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

import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURATION
// ============================================

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // "Rachel" - default female voice
const BATCH_SIZE = 50; // Max participants per run

// Text templates with podcast framing
const TEXTS = {
    low: 'Welcome back to the podcast. This is the low personalization test ad. Now back to the episode.',
    medium: 'Welcome back to the podcast. This is the medium personalization test ad. Now back to the episode.',
    high: 'Welcome back to the podcast. This is the high personalization test ad. Now back to the episode.',
};

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
// ELEVENLABS TTS FUNCTION
// ============================================

async function generateAudio(text: string): Promise<Buffer> {
    const response = await fetch(`${ELEVENLABS_API_URL}/${VOICE_ID}`, {
        method: 'POST',
        headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': elevenLabsKey!,
        },
        body: JSON.stringify({
            text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.5,
            },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

// ============================================
// UPLOAD TO SUPABASE
// ============================================

async function uploadAudio(path: string, buffer: Buffer): Promise<void> {
    const { error } = await supabase
        .storage
        .from('ads-audio')
        .upload(path, buffer, {
            contentType: 'audio/mpeg',
            upsert: true,
        });

    if (error) {
        throw new Error(`Supabase upload error: ${error.message}`);
    }
}

// ============================================
// PROCESS LOW CONDITION (SHARED FILE)
// ============================================

async function processLowCondition(): Promise<number> {
    console.log('\n📢 Processing LOW condition (shared file)...');

    // Check if low.mp3 already exists
    const { data: existingFile } = await supabase
        .storage
        .from('ads-audio')
        .list('', { search: 'low.mp3' });

    const lowFileExists = existingFile?.some(f => f.name === 'low.mp3');

    if (!lowFileExists) {
        console.log('  🎙️  Generating low.mp3...');
        try {
            const audioBuffer = await generateAudio(TEXTS.low);
            await uploadAudio('low.mp3', audioBuffer);
            console.log('  ✅ low.mp3 uploaded');
        } catch (error) {
            console.error('  ❌ Failed to generate/upload low.mp3:', error);
            return 0;
        }
    } else {
        console.log('  ✅ low.mp3 already exists');
    }

    // Update ALL pending LOW participants
    const { data: updated, error } = await supabase
        .from('participants')
        .update({
            audio_status: 'generated',
            audio_path: 'low.mp3',
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

async function processMediumHighConditions(): Promise<{ generated: number; errors: number }> {
    console.log('\n📢 Processing MEDIUM/HIGH conditions...');

    // Fetch pending participants
    const { data: participants, error } = await supabase
        .from('participants')
        .select('prolific_pid, condition')
        .in('condition', ['medium', 'high'])
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
        const text = p.condition === 'medium' ? TEXTS.medium : TEXTS.high;
        const audioPath = `${p.prolific_pid}.mp3`;

        try {
            console.log(`  🎙️  Generating audio for ${p.prolific_pid} (${p.condition})...`);

            const audioBuffer = await generateAudio(text);
            await uploadAudio(audioPath, audioBuffer);

            // Update participant
            await supabase
                .from('participants')
                .update({
                    audio_status: 'generated',
                    audio_path: audioPath,
                    audio_generated_at: new Date().toISOString(),
                    audio_error: null,
                    // For HIGH, qc_status stays 'pending' (already default)
                })
                .eq('prolific_pid', p.prolific_pid);

            console.log(`  ✅ ${p.prolific_pid}: uploaded ${audioPath}`);
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
