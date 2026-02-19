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
 *     "country": "UK",
 *     "city": "London",
 *     "age": 25,
 *     "past_category": "Social media scrolling",
 *     "goal_category": "Work productivity",
 *     "podcast_frequency": "Weekly",
 *     "podcast_genres": ["Comedy", "News"],
 *     "shortform_frequency": "Daily",
 *     "favorite_movie_genre": "Action",
 *     "streaming_services": ["Netflix"],
 *     "devices": ["Phone"],
 *     "notifications_per_day": "51-100",
 *     "busy_challenge": "Staying focused",
 *     "attention_check_pass": true,
 *     "submitted_at": "2024-01-15T10:30:00Z"
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Define the expected request body structure
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
        [key: string]: unknown; // Allow additional fields like 'other_text' if needed
    };
}

// Function to derive age range
function deriveAgeRange(age: number): string {
    if (age >= 18 && age <= 19) return 'if you are below 20';
    if (age >= 20 && age <= 29) return 'in your 20s';
    if (age >= 30 && age <= 39) return 'in your 30s';
    if (age >= 40 && age <= 49) return 'in your 40s';
    if (age >= 50 && age <= 59) return 'in your 50s';
    if (age >= 60 && age <= 69) return 'in your 60s';
    if (age >= 70 && age <= 79) return 'in your 70s';
    if (age >= 80 && age <= 99) return 'in your 80s';
    return 'in your current stage of life';
}

// Function to randomly assign condition
function assignCondition(): 'low' | 'medium' | 'high_a' | 'high_b' {
    const conditions = ['low', 'medium', 'high_a', 'high_b'] as const;
    const randomIndex = Math.floor(Math.random() * conditions.length);
    return conditions[randomIndex];
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

        // Check required T0 fields
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
        // STEP 3: Handle Condition Assignment
        // ============================================
        // Check if participant already exists to keep condition stable
        const { data: existingParticipant } = await supabaseAdmin
            .from('participants')
            .select('condition')
            .eq('prolific_pid', body.prolific_pid)
            .single();

        let assignedCondition = existingParticipant?.condition;

        if (!assignedCondition) {
            assignedCondition = assignCondition();
        }

        // ============================================
        // STEP 4: Prepare Data for Supabase
        // ============================================
        const ageRange = deriveAgeRange(body.t0_payload.age);

        // Determine status based on screen out (if country is Other, frontend should screen out, but backend can enforce too)
        // Note: The requirement was "If 'Other', block continuation (screen out) OR store and show 'not eligible'".
        // We will store them but mark as screened_out if necessary, or just 'pending' but effectively dead.
        // Let's stick to 'pending' unless specific screen-out status is requested, 
        // but since we want to screen out, let's mark them as such if valid.
        // However, standard flow is just 'pending' for valid submissions.

        const participantData = {
            prolific_pid: body.prolific_pid,
            study_id_t0: body.study_id,
            session_id_t0: body.session_id,
            condition: assignedCondition,
            t0_completed_at: new Date().toISOString(),
            // T0 fields
            country: body.t0_payload.country,
            city: body.t0_payload.city,
            age: body.t0_payload.age,
            age_range: ageRange,
            past_category: body.t0_payload.past_category,
            goal_category: body.t0_payload.goal_category,
            // Distractors
            podcast_frequency: body.t0_payload.podcast_frequency,
            podcast_genres: body.t0_payload.podcast_genres,
            shortform_frequency: body.t0_payload.shortform_frequency,
            favorite_movie_genre: body.t0_payload.favorite_movie_genre,
            streaming_services: body.t0_payload.streaming_services,
            devices: body.t0_payload.devices,
            notifications_per_day: body.t0_payload.notifications_per_day,
            busy_challenge: body.t0_payload.busy_challenge,
            attention_check_pass: body.t0_payload.attention_check_pass,
            status: 'pending', // Default status unless logic dictates otherwise
        };

        // ============================================
        // STEP 5: Save to Supabase
        // ============================================
        const { error } = await supabaseAdmin
            .from('participants')
            .upsert(participantData, {
                onConflict: 'prolific_pid'
            });

        if (error) {
            console.error('❌ Supabase error:', error);
            return NextResponse.json(
                { error: 'Database error', details: error.message },
                { status: 500 }
            );
        }

        console.log(`✅ Saved data for ${body.prolific_pid}. Condition: ${assignedCondition}`);

        // ============================================
        // STEP 6: Return success response
        // ============================================
        return NextResponse.json({
            success: true,
            message: 'T0 data saved successfully',
            assigned_condition: assignedCondition, // Useful for debug, maybe remove in prod if blinding is needed
        });

    } catch (error) {
        console.error('❌ Error in /api/t0/submit:', error);
        return NextResponse.json(
            { error: 'Invalid request body or server error' },
            { status: 500 }
        );
    }
}
