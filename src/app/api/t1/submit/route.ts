/**
 * API Route: POST /api/t1/submit
 * ==============================
 * 
 * One-time T1 submission: atomic update that only succeeds
 * if t1_submitted_at IS NULL (prevents double submission).
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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

        const timestamp = new Date().toISOString();

        // ============================================
        // STEP 3: Atomic update — only if t1_submitted_at IS NULL
        // ============================================
        const { data: updated, error: updateError } = await supabaseAdmin
            .from('participants')
            .update({ t1_submitted_at: timestamp })
            .eq('prolific_pid', body.prolific_pid)
            .is('t1_submitted_at', null)
            .select('prolific_pid');

        if (updateError) {
            console.error('❌ Supabase update error:', updateError);
            return NextResponse.json(
                { ok: false, error: updateError.message },
                { status: 500 }
            );
        }

        // If no rows were updated, T1 was already submitted
        if (!updated || updated.length === 0) {
            console.log(`⚠️ T1 duplicate attempt: ${body.prolific_pid}`);
            return NextResponse.json({
                ok: false,
                already_completed_t1: true,
            });
        }

        // ============================================
        // STEP 4: Insert into responses_t1 table
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

        console.log('✅ T1 response saved successfully');

        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error('❌ Unexpected error in /api/t1/submit:', error);
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
