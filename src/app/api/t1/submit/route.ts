/**
 * API Route: POST /api/t1/submit
 * ==============================
 * 
 * This endpoint saves T1 survey responses to Supabase.
 * 
 * Request Body:
 *   - prolific_pid: string (required)
 *   - response_payload: object (survey responses)
 * 
 * Response:
 *   - 200: { ok: true }
 *   - 400: { ok: false, error: "Missing prolific_pid" }
 *   - 500: { ok: false, error: <message> }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Define expected request body structure
interface T1SubmitBody {
    prolific_pid: string;
    response_payload?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
    try {
        // ============================================
        // STEP 1: Parse request body
        // ============================================
        const body: T1SubmitBody = await request.json();

        // ============================================
        // STEP 2: Validate required fields
        // ============================================
        if (!body.prolific_pid) {
            return NextResponse.json(
                { ok: false, error: 'Missing prolific_pid' },
                { status: 400 }
            );
        }

        console.log('📥 T1 Submission Received:');
        console.log('  Prolific PID:', body.prolific_pid);
        console.log('  Payload:', JSON.stringify(body.response_payload, null, 2));

        const timestamp = new Date().toISOString();

        // ============================================
        // STEP 3: Insert into responses_t1 table
        // ============================================
        const { error: insertError } = await supabaseAdmin
            .from('responses_t1')
            .insert({
                prolific_pid: body.prolific_pid,
                response_payload: body.response_payload || {},
            });

        if (insertError) {
            console.error('❌ Supabase insert error:', insertError);
            return NextResponse.json(
                { ok: false, error: insertError.message },
                { status: 500 }
            );
        }

        // ============================================
        // STEP 4: Update participants table
        // ============================================
        const { error: updateError } = await supabaseAdmin
            .from('participants')
            .update({ t1_completed_at: timestamp })
            .eq('prolific_pid', body.prolific_pid);

        if (updateError) {
            console.error('❌ Supabase update error:', updateError);
            return NextResponse.json(
                { ok: false, error: updateError.message },
                { status: 500 }
            );
        }

        console.log('✅ T1 response saved successfully');

        // ============================================
        // STEP 5: Return success
        // ============================================
        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error('❌ Unexpected error in /api/t1/submit:', error);
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
