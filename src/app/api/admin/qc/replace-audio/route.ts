/**
 * API: POST /api/admin/qc/replace-audio
 * ======================================
 * 
 * Replaces a participant's audio file.
 * Accepts an ad-only MP3, stitches it with podcast intro/outro,
 * uploads the stitched result, and sets awaiting_second_check.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { stitchWithPodcast } from '@/lib/audio-stitch';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const prolificPid = formData.get('prolific_pid') as string;
        const file = formData.get('file') as File;
        const qcNotes = formData.get('qc_notes') as string | null;

        // Validate inputs
        if (!prolificPid) {
            return NextResponse.json({ ok: false, error: 'Missing prolific_pid' }, { status: 400 });
        }

        if (!file) {
            return NextResponse.json({ ok: false, error: 'Missing file' }, { status: 400 });
        }

        // Get current participant data for condition + replaced count
        const { data: currentData, error: fetchError } = await supabaseAdmin
            .from('participants')
            .select('condition, qc_replaced_count')
            .eq('prolific_pid', prolificPid)
            .single();

        if (fetchError || !currentData) {
            return NextResponse.json({ ok: false, error: 'Participant not found' }, { status: 404 });
        }

        const newVersion = (currentData.qc_replaced_count || 0) + 1;
        const audioPath = `${prolificPid}_${currentData.condition}_v${newVersion}_final.mp3`;

        // Convert uploaded file to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const adBuffer = Buffer.from(arrayBuffer);

        // Stitch with podcast intro/outro
        console.log(`🎧 Stitching replacement audio for ${prolificPid}...`);
        const stitchedBuffer = await stitchWithPodcast(adBuffer, audioPath);

        // Upload stitched audio to Supabase storage
        const { error: uploadError } = await supabaseAdmin
            .storage
            .from('ads-audio')
            .upload(audioPath, stitchedBuffer, {
                contentType: 'audio/mpeg',
                upsert: true,
            });

        if (uploadError) {
            console.error('❌ Upload error:', uploadError);
            return NextResponse.json({ ok: false, error: uploadError.message }, { status: 500 });
        }

        // Update participant record
        const { error: updateError } = await supabaseAdmin
            .from('participants')
            .update({
                audio_status: 'awaiting_second_check',
                audio_path: audioPath,
                audio_generated_at: new Date().toISOString(),
                audio_error: null,
                qc_status: 'awaiting_second_check',
                qc_checked_at: new Date().toISOString(),
                qc_notes: qcNotes || null,
                qc_replaced_count: newVersion,
            })
            .eq('prolific_pid', prolificPid);

        if (updateError) {
            console.error('❌ Update error:', updateError);
            return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
        }

        console.log(`✅ Replaced & stitched audio for: ${prolificPid} → ${audioPath}`);
        return NextResponse.json({ ok: true, audio_path: audioPath });

    } catch (error) {
        console.error('❌ Unexpected error:', error);
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
