/**
 * API Route: GET /api/t1/get-audio
 * =================================
 * 
 * This endpoint checks the audio generation status for a participant
 * and returns a signed URL if audio is ready.
 * 
 * Query Parameters:
 *   - prolific_pid: The participant's Prolific ID (required)
 * 
 * Example Request:
 *   GET /api/t1/get-audio?prolific_pid=abc123
 * 
 * Response:
 *   - 400: Missing prolific_pid { ok: false, error: "Missing prolific_pid" }
 *   - 200: Not found { ok: true, found: false, status: "not_found" }
 *   - 200: Found { ok: true, found: true, prolific_pid, condition, status, audio_path, audio_url, audio_error, audio_generated_at }
 *   - 500: Server error { ok: false, error: <message> }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Define the participant data structure from Supabase
interface ParticipantAudioData {
    prolific_pid: string;
    condition: string | null;
    audio_status: string | null;
    audio_path: string | null;
    audio_error: string | null;
    audio_generated_at: string | null;
    qc_status: string | null;
}

export async function GET(request: NextRequest) {
    // ============================================
    // STEP 1: Extract query parameters
    // ============================================
    const searchParams = request.nextUrl.searchParams;
    const prolificPid = searchParams.get('prolific_pid');

    // ============================================
    // STEP 2: Validate required parameters
    // ============================================
    if (!prolificPid) {
        return NextResponse.json(
            { ok: false, error: 'Missing prolific_pid' },
            { status: 400 }
        );
    }

    // ============================================
    // STEP 3: Log the request (for debugging)
    // ============================================
    console.log('🔍 Audio status check for:', prolificPid);

    try {
        // ============================================
        // STEP 4: Query Supabase for participant data
        // ============================================
        const { data, error } = await supabaseAdmin
            .from('participants')
            .select('prolific_pid, condition, audio_status, audio_path, audio_error, audio_generated_at, qc_status')
            .eq('prolific_pid', prolificPid)
            .single();

        // Handle database errors
        if (error) {
            // PGRST116 means no rows returned (not found)
            if (error.code === 'PGRST116') {
                console.log('📭 Participant not found:', prolificPid);
                return NextResponse.json({
                    ok: true,
                    found: false,
                    status: 'not_found',
                });
            }

            // Other database errors
            console.error('❌ Supabase error:', error);
            return NextResponse.json(
                { ok: false, error: error.message },
                { status: 500 }
            );
        }

        // ============================================
        // STEP 5: Check audio status and QC gating
        // ============================================
        // ============================================
        // STEP 5: Check audio status and QC gating
        // ============================================
        const participant = data as ParticipantAudioData;

        // 1. LOW Condition: Always playable
        if (participant.condition === 'low') {
            console.log('✅ LOW condition, serving low.mp3');

            // Generate signed URL for low.mp3
            const { data: signedData, error: signedError } = await supabaseAdmin
                .storage
                .from('ads-audio')
                .createSignedUrl('low.mp3', 600);

            if (signedError) {
                console.error('❌ Error signing low.mp3:', signedError);
                // Fallback or error?
            }

            return NextResponse.json({
                ok: true,
                found: true,
                status: 'ready',
                audio_url: signedData?.signedUrl || null,
                prolific_pid: participant.prolific_pid,
                condition: 'low'
            });
        }

        // 2. Pending Generation
        if (!participant.audio_status || participant.audio_status === 'pending') {
            console.log('⏳ Audio pending generation:', prolificPid);
            return NextResponse.json({
                ok: true,
                found: true,
                status: 'pending',
                audio_url: null,
            });
        }

        // 3. Under Review (QC Pending)
        if (participant.audio_status === 'under_review' || participant.qc_status === 'pending') {
            console.log('🔒 Audio under QC review:', prolificPid);
            return NextResponse.json({
                ok: true,
                found: true,
                status: 'under_review',
                audio_url: null,
            });
        }

        // 4. Ready & Approved
        if (participant.audio_status === 'ready' && participant.qc_status === 'approved' && participant.audio_path) {
            console.log('✅ Audio ready and approved:', prolificPid);

            // Generate signed URL
            const { data: signedData, error: signedError } = await supabaseAdmin
                .storage
                .from('ads-audio')
                .createSignedUrl(participant.audio_path, 600);

            return NextResponse.json({
                ok: true,
                found: true,
                status: 'ready',
                audio_url: signedData?.signedUrl || null,
                prolific_pid: participant.prolific_pid,
                condition: participant.condition,
                audio_generated_at: participant.audio_generated_at
            });
        }

        // Fallback for other states (e.g. error, or mismatch)
        return NextResponse.json({
            ok: true,
            found: true,
            status: participant.audio_status || 'unknown',
            audio_url: null
        });

    } catch (error) {
        // Handle unexpected errors
        console.error('❌ Unexpected error in /api/t1/get-audio:', error);
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
