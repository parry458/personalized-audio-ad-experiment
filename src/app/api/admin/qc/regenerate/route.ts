/**
 * API: POST /api/admin/qc/regenerate
 * ====================================
 * 
 * Batch regeneration for participants marked "needs_fix".
 * For each participant: re-render stimulus text → TTS → stitch → upload → update DB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { generateAudio, uploadAudio } from '@/lib/audio-generator';
import { getStimulusText } from '@/lib/stimulus-generator';
import { stitchWithPodcast } from '@/lib/audio-stitch';

// Allow up to 60 seconds for batch regeneration
export const maxDuration = 60;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { prolific_pids } = body as { prolific_pids: string[] };

        if (!prolific_pids || prolific_pids.length === 0) {
            return NextResponse.json({ ok: false, error: 'Missing or empty prolific_pids' }, { status: 400 });
        }

        const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
        if (!elevenLabsKey) {
            return NextResponse.json({ ok: false, error: 'Missing ELEVENLABS_API_KEY' }, { status: 500 });
        }

        const results: { pid: string; success: boolean; error?: string; audio_path?: string }[] = [];

        for (const pid of prolific_pids) {
            try {
                console.log(`🔄 Regenerating audio for ${pid}...`);

                // 1. Fetch participant data
                const { data: participant, error: fetchError } = await supabaseAdmin
                    .from('participants')
                    .select('*')
                    .eq('prolific_pid', pid)
                    .single();

                if (fetchError || !participant) {
                    results.push({ pid, success: false, error: 'Participant not found' });
                    continue;
                }

                // 2. Re-render stimulus text
                const stimulusText = getStimulusText(participant);
                console.log(`  📝 Stimulus text generated`);

                // 3. Generate audio via ElevenLabs TTS
                const audioBuffer = await generateAudio(stimulusText, elevenLabsKey);
                console.log(`  🎙️ TTS audio generated`);

                // 4. Determine versioned path
                const newVersion = (participant.qc_replaced_count || 0) + 1;
                const audioPath = `${pid}_${participant.condition}_v${newVersion}_final.mp3`;

                // 5. Stitch with podcast intro/outro
                console.log(`  🎧 Stitching with podcast...`);
                const stitchedBuffer = await stitchWithPodcast(audioBuffer, audioPath);

                // 6. Upload stitched audio
                await uploadAudio(audioPath, stitchedBuffer);
                console.log(`  ⬆️ Uploaded: ${audioPath}`);

                // 7. Update DB
                const { error: updateError } = await supabaseAdmin
                    .from('participants')
                    .update({
                        stimulus_text: stimulusText,
                        audio_status: 'awaiting_second_check',
                        qc_status: 'awaiting_second_check',
                        audio_path: audioPath,
                        audio_generated_at: new Date().toISOString(),
                        audio_error: null,
                        qc_checked_at: new Date().toISOString(),
                        qc_replaced_count: newVersion,
                    })
                    .eq('prolific_pid', pid);

                if (updateError) {
                    results.push({ pid, success: false, error: updateError.message });
                    continue;
                }

                console.log(`  ✅ ${pid} regenerated → ${audioPath}`);
                results.push({ pid, success: true, audio_path: audioPath });

            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                console.error(`  ❌ ${pid}: ${errorMsg}`);
                results.push({ pid, success: false, error: errorMsg });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        console.log(`\n📊 Regeneration complete: ${successCount} success, ${failCount} failed`);

        return NextResponse.json({
            ok: true,
            summary: { total: prolific_pids.length, success: successCount, failed: failCount },
            results,
        });

    } catch (error) {
        console.error('❌ Unexpected error in /api/admin/qc/regenerate:', error);
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
