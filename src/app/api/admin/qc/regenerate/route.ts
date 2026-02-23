/**
 * API: POST /api/admin/qc/regenerate
 * ====================================
 * 
 * DISABLED: Regeneration is handled locally via `npm run generate-audio`.
 * This endpoint returns 410 Gone.
 */

import { NextResponse } from 'next/server';

export async function POST() {
    return NextResponse.json(
        { ok: false, error: 'Regeneration is handled locally via npm run generate-audio' },
        { status: 410 }
    );
}
