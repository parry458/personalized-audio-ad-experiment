/**
 * Screener API – check or record screener failures
 * GET  ?prolific_pid=xxx → { screen_failed: boolean }
 * POST { prolific_pid }   → record failure
 */
import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// ─── GET: Check if PID has failed the screener ─────────────────
export async function GET(request: NextRequest) {
    const prolificPid = request.nextUrl.searchParams.get('prolific_pid');
    if (!prolificPid) {
        return NextResponse.json({ screen_failed: false });
    }

    const { data } = await supabaseAdmin
        .from('screen_failures')
        .select('prolific_pid')
        .eq('prolific_pid', prolificPid)
        .maybeSingle();

    return NextResponse.json({ screen_failed: !!data });
}

// ─── POST: Record a screener failure ────────────────────────────
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const pid = body.prolific_pid;

        if (!pid) {
            return NextResponse.json({ ok: false, error: 'Missing prolific_pid' }, { status: 400 });
        }

        // Upsert to handle duplicates gracefully
        await supabaseAdmin
            .from('screen_failures')
            .upsert({ prolific_pid: pid, failed_at: new Date().toISOString() }, { onConflict: 'prolific_pid' });

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
}
