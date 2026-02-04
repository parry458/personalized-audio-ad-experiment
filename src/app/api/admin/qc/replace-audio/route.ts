/**
 * API: POST /api/admin/qc/replace-audio
 * ======================================
 * 
 * Replaces a participant's audio file.
 * Uploads new MP3, updates participant record, resets QC status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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

        // Convert File to ArrayBuffer for upload
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        // Define storage path
        const audioPath = `${prolificPid}.mp3`;

        // Upload to Supabase storage (upsert = overwrite if exists)
        const { error: uploadError } = await supabaseAdmin
            .storage
            .from('ads-audio')
            .upload(audioPath, buffer, {
                contentType: 'audio/mpeg',
                upsert: true,
            });

        if (uploadError) {
            console.error('❌ Upload error:', uploadError);
            return NextResponse.json({ ok: false, error: uploadError.message }, { status: 500 });
        }

        // First, get current qc_replaced_count
        const { data: currentData } = await supabaseAdmin
            .from('participants')
            .select('qc_replaced_count')
            .eq('prolific_pid', prolificPid)
            .single();

        const currentCount = currentData?.qc_replaced_count || 0;

        // Update participant record with incremented count
        const { error: updateError } = await supabaseAdmin
            .from('participants')
            .update({
                audio_status: 'generated',
                audio_path: audioPath,
                audio_generated_at: new Date().toISOString(),
                audio_error: null,
                qc_status: 'pending',
                qc_checked_at: new Date().toISOString(),
                qc_notes: qcNotes || null,
                qc_replaced_count: currentCount + 1,
            })
            .eq('prolific_pid', prolificPid);

        if (updateError) {
            console.error('❌ Update error:', updateError);
            return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
        }

        console.log('✅ Replaced audio for:', prolificPid);
        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error('❌ Unexpected error:', error);
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
