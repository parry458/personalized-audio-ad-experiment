/**
 * API Route: POST /api/t0/submit
 * ==============================
 * 
 * One-time T0 submission: INSERT only, never upsert/overwrite.
 * If prolific_pid already exists → returns already_completed_t0: true.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { computeAgeRange } from '@/lib/age-range';

interface T0SubmitRequest {
    prolific_pid: string;
    study_id: string;
    session_id: string;
    t0_payload: {
        country: string;
        city: string;
        age: number;
        past_category: string;
        goal_category: string;
        podcast_frequency?: string;
        podcast_genres?: string[];
        shortform_frequency?: string;
        favorite_movie_genre?: string;
        streaming_services?: string[];
        devices?: string[];
        notifications_per_day?: string;
        busy_challenge?: string;
        attention_check_pass: boolean;
        submitted_at: string;
        duration_seconds?: number;
        [key: string]: unknown;
    };
}

// Block randomization: assign to the condition with the fewest participants.
async function assignCondition(): Promise<'low' | 'medium' | 'high_a' | 'high_b'> {
    const conditions = ['low', 'medium', 'high_a', 'high_b'] as const;

    const counts: Record<string, number> = {};
    for (const c of conditions) {
        const { count } = await supabaseAdmin
            .from('participants')
            .select('*', { count: 'exact', head: true })
            .eq('condition', c);
        counts[c] = count ?? 0;
    }

    const minCount = Math.min(...Object.values(counts));
    const candidates = conditions.filter(c => counts[c] === minCount);
    return candidates[Math.floor(Math.random() * candidates.length)];
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

        const requiredFields = ['country', 'city', 'age', 'past_category', 'goal_category'];
        for (const field of requiredFields) {
            if (!body.t0_payload[field as keyof typeof body.t0_payload]) {
                return NextResponse.json(
                    { error: `Missing required T0 field: ${field}` },
                    { status: 400 }
                );
            }
        }

        // ============================================
        // STEP 3: Check if participant already exists
        // ============================================
        const { data: existingParticipant } = await supabaseAdmin
            .from('participants')
            .select('prolific_pid, condition')
            .eq('prolific_pid', body.prolific_pid)
            .single();

        if (existingParticipant) {
            // Already submitted T0 — do NOT overwrite
            console.log(`⚠️ T0 duplicate attempt: ${body.prolific_pid} (condition: ${existingParticipant.condition})`);
            return NextResponse.json({
                ok: false,
                already_completed_t0: true,
                condition: existingParticipant.condition,
            });
        }

        // ============================================
        // STEP 4: Assign condition (first-time only)
        // ============================================
        const assignedCondition = await assignCondition();
        const ageRange = computeAgeRange(body.t0_payload.age);

        // ============================================
        // STEP 5: INSERT new row (never upsert)
        // ============================================
        const { error } = await supabaseAdmin
            .from('participants')
            .insert({
                prolific_pid: body.prolific_pid,
                study_id_t0: body.study_id,
                session_id_t0: body.session_id,
                condition: assignedCondition,
                t0_completed_at: new Date().toISOString(),
                country: body.t0_payload.country,
                city: body.t0_payload.city,
                age: body.t0_payload.age,
                age_range: ageRange,
                past_category: body.t0_payload.past_category,
                goal_category: body.t0_payload.goal_category,
                podcast_frequency: body.t0_payload.podcast_frequency,
                podcast_genres: body.t0_payload.podcast_genres,
                shortform_frequency: body.t0_payload.shortform_frequency,
                favorite_movie_genre: body.t0_payload.favorite_movie_genre,
                streaming_services: body.t0_payload.streaming_services,
                devices: body.t0_payload.devices,
                notifications_per_day: body.t0_payload.notifications_per_day,
                busy_challenge: body.t0_payload.busy_challenge,
                attention_check_pass: body.t0_payload.attention_check_pass,
                status: 'pending',
                t0_duration_seconds: body.t0_payload.duration_seconds ?? null,
            });

        if (error) {
            // Unique constraint violation = race condition duplicate
            if (error.code === '23505') {
                console.log(`⚠️ T0 race-condition duplicate: ${body.prolific_pid}`);
                return NextResponse.json({
                    ok: false,
                    already_completed_t0: true,
                });
            }

            console.error('❌ Supabase error:', error);
            return NextResponse.json(
                { error: 'Database error', details: error.message },
                { status: 500 }
            );
        }

        console.log(`✅ T0 created for ${body.prolific_pid}. Condition: ${assignedCondition}`);

        return NextResponse.json({
            ok: true,
            created: true,
            assigned_condition: assignedCondition,
        });

    } catch (error) {
        console.error('❌ Error in /api/t0/submit:', error);
        return NextResponse.json(
            { error: 'Invalid request body or server error' },
            { status: 500 }
        );
    }
}
