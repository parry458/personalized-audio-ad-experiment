/**
 * API: POST /api/admin/qc/needs-fix
 * ==================================
 * 
 * Marks a participant's audio as needing fixes.
 * Updates qc_status to 'needs_fix' and records timestamp.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { prolific_pid, qc_notes } = body;

        if (!prolific_pid) {
            return NextResponse.json({ ok: false, error: 'Missing prolific_pid' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('participants')
            .update({
                qc_status: 'needs_fix',
                qc_checked_at: new Date().toISOString(),
                qc_notes: qc_notes || null,
            })
            .eq('prolific_pid', prolific_pid);

        if (error) {
            console.error('❌ Error marking needs_fix:', error);
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        console.log('⚠️ Marked needs_fix:', prolific_pid);
        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error('❌ Unexpected error:', error);
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
