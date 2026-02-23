/**
 * API Route: GET /api/t0/check
 * =============================
 * 
 * Lightweight check: does this prolific_pid already have a T0 row?
 * Used by the T0 page on mount to gate the form before it renders.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
    const prolificPid = request.nextUrl.searchParams.get('prolific_pid');

    if (!prolificPid) {
        return NextResponse.json({ ok: false, error: 'Missing prolific_pid' }, { status: 400 });
    }

    const { data } = await supabaseAdmin
        .from('participants')
        .select('prolific_pid, condition')
        .eq('prolific_pid', prolificPid)
        .single();

    if (data) {
        return NextResponse.json({ ok: true, already_completed_t0: true, condition: data.condition });
    }

    return NextResponse.json({ ok: true, already_completed_t0: false });
}
