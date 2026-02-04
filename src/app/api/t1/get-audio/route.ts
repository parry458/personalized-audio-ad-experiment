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
        const participant = data as ParticipantAudioData;

        // If audio not generated yet or path missing
        if (participant.audio_status !== 'generated' || !participant.audio_path) {
            console.log('⏳ Audio not ready for:', prolificPid, '| Status:', participant.audio_status);
            return NextResponse.json({
                ok: true,
                found: true,
                status: 'pending',
                audio_url: null,
            });
        }

        // QC gating for HIGH condition
        if (participant.condition === 'high' && participant.qc_status !== 'approved') {
            console.log('🔒 QC pending for HIGH condition:', prolificPid, '| QC Status:', participant.qc_status);
            return NextResponse.json({
                ok: true,
                found: true,
                status: 'qc_pending',
                audio_url: null,
            });
        }

        // ============================================
        // STEP 6: Generate signed URL (audio is ready)
        // ============================================
        let audioUrl: string | null = null;
        console.log('🔗 Generating signed URL for:', participant.audio_path);

        const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin
            .storage
            .from('ads-audio')
            .createSignedUrl(participant.audio_path, 600); // 600 seconds = 10 minutes

        if (signedUrlError) {
            console.error('❌ Signed URL error:', signedUrlError);
            // Don't fail the whole request, just log and continue with null URL
        } else if (signedUrlData) {
            audioUrl = signedUrlData.signedUrl;
            console.log('✅ Signed URL generated successfully');
        }

        // ============================================
        // STEP 6: Return participant audio data
        // ============================================
        console.log('✅ Found participant:', prolificPid, '| Status: ready');

        return NextResponse.json({
            ok: true,
            found: true,
            prolific_pid: participant.prolific_pid,
            condition: participant.condition,
            status: 'ready',
            audio_path: participant.audio_path,
            audio_url: audioUrl,
            audio_error: participant.audio_error,
            audio_generated_at: participant.audio_generated_at,
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
