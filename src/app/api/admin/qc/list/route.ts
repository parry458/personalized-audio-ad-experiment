/**
 * API: GET /api/admin/qc/list
 * ============================
 * 
 * Returns all HIGH condition participants needing QC review.
 * Includes signed URLs for audio playback.
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface ParticipantQC {
    prolific_pid: string;
    condition: string;
    audio_status: string;
    audio_path: string | null;
    audio_generated_at: string | null;
    qc_status: string;
    qc_checked_at: string | null;
    qc_notes: string | null;
    qc_replaced_count: number;
}

export async function GET() {
    try {
        // Fetch HIGH condition participants needing QC
        const { data, error } = await supabaseAdmin
            .from('participants')
            .select('prolific_pid, condition, audio_status, audio_path, audio_generated_at, qc_status, qc_checked_at, qc_notes, qc_replaced_count')
            .eq('condition', 'high')
            .eq('audio_status', 'generated')
            .in('qc_status', ['pending', 'needs_fix'])
            .order('audio_generated_at', { ascending: false });

        if (error) {
            console.error('❌ Error fetching QC list:', error);
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        // Generate signed URLs for each participant
        const participants = await Promise.all(
            (data as ParticipantQC[]).map(async (p) => {
                let audioUrl: string | null = null;

                if (p.audio_path) {
                    const { data: signedData } = await supabaseAdmin
                        .storage
                        .from('ads-audio')
                        .createSignedUrl(p.audio_path, 600);

                    if (signedData) {
                        audioUrl = signedData.signedUrl;
                    }
                }

                return { ...p, audio_url: audioUrl };
            })
        );

        return NextResponse.json({ ok: true, participants });

    } catch (error) {
        console.error('❌ Unexpected error in /api/admin/qc/list:', error);
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
