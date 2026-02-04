/**
 * API Route: POST /api/t0/submit
 * ==============================
 * 
 * This endpoint receives T0 (first part) form submissions from participants.
 * 
 * Expected Request Body (JSON):
 * {
 *   "prolific_pid": "participant_id_from_prolific",
 *   "study_id": "study_id_from_prolific",
 *   "session_id": "session_id_from_prolific",
 *   "t0_payload": {
 *     "first_name": "John",
 *     "submitted_at": "2024-01-15T10:30:00Z"
 *   }
 * }
 * 
 * Response:
 *   - 200: Success, data received
 *   - 400: Bad request (missing fields)
 *   - 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Define the expected request body structure
interface T0SubmitRequest {
    prolific_pid: string;
    study_id: string;
    session_id: string;
    t0_payload: {
        first_name: string;
        submitted_at: string;
        [key: string]: unknown; // Allow additional fields
    };
}

export async function POST(request: NextRequest) {
    try {
        // ============================================
        // STEP 1: Parse the JSON body
        // ============================================
        const body: T0SubmitRequest = await request.json();

        // ============================================
        // STEP 2: Validate required fields
        // ============================================
        if (!body.prolific_pid) {
            return NextResponse.json(
                { error: 'Missing required field: prolific_pid' },
                { status: 400 }
            );
        }

        if (!body.t0_payload) {
            return NextResponse.json(
                { error: 'Missing required field: t0_payload' },
                { status: 400 }
            );
        }

        // ============================================
        // STEP 3: Log the received data (for debugging)
        // ============================================
        console.log('📥 T0 Submission Received:');
        console.log('  Prolific PID:', body.prolific_pid);
        console.log('  Study ID:', body.study_id);
        console.log('  Session ID:', body.session_id);
        console.log('  Payload:', JSON.stringify(body.t0_payload, null, 2));

        // ============================================
        // STEP 4: Save to Supabase
        // ============================================
        const { error } = await supabaseAdmin
            .from('participants')
            .upsert({
                prolific_pid: body.prolific_pid,
                study_id_t0: body.study_id,
                session_id_t0: body.session_id,
                condition: 'low',  // Allowed values: 'low', 'medium', 'high'
                t0_completed_at: new Date().toISOString(),
            }, {
                onConflict: 'prolific_pid'  // Update if participant already exists
            });

        if (error) {
            console.error('❌ Supabase error:', error);
            return NextResponse.json(
                { error: 'Database error', details: error.message },
                { status: 500 }
            );
        }

        console.log('✅ Saved to Supabase successfully');

        // ============================================
        // STEP 5: Return success response
        // ============================================
        return NextResponse.json({
            success: true,
            message: 'T0 data saved successfully',
            received: {
                prolific_pid: body.prolific_pid,
                payload_keys: Object.keys(body.t0_payload),
            },
        });

    } catch (error) {
        // Handle JSON parsing errors or other exceptions
        console.error('❌ Error in /api/t0/submit:', error);
        return NextResponse.json(
            { error: 'Invalid request body or server error' },
            { status: 500 }
        );
    }
}
