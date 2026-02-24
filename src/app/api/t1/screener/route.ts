/**
 * T1 Screener API – check or record T1 screener failures
 * GET  ?prolific_pid=xxx → { t1_screen_failed: boolean }
 * POST { prolific_pid }   → update participants row with failure info
 */
import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// ─── GET: Check if PID has failed the T1 screener ──────────────
export async function GET(request: NextRequest) {
    const prolificPid = request.nextUrl.searchParams.get('prolific_pid');
    if (!prolificPid) {
        return NextResponse.json({ t1_screen_failed: false });
    }

    const { data } = await supabaseAdmin
        .from('participants')
        .select('t1_screen_failed')
        .eq('prolific_pid', prolificPid)
        .maybeSingle();

    return NextResponse.json({ t1_screen_failed: !!data?.t1_screen_failed });
}

// ─── POST: Record a T1 screener failure ─────────────────────────
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const pid = body.prolific_pid;

        if (!pid) {
            return NextResponse.json({ ok: false, error: 'Missing prolific_pid' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('participants')
            .update({
                t1_screen_failed: true,
                t1_screen_failed_at: new Date().toISOString(),
                t1_screen_fail_reason: 'failed_t1_screener',
            })
            .eq('prolific_pid', pid);

        if (error) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
}
