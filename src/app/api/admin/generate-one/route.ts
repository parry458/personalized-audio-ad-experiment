
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { generateAudio, uploadAudio } from '@/lib/audio-generator';
import { getStimulusText } from '@/lib/stimulus-generator';

// Use admin client for DB updates logic if needed, but here we can stick to basic setup
// Note: In an edge runtime or specific Next.js setup, we might need a specific client.
// Assuming standard Node runtime for APIs.

export async function GET(request: NextRequest) {
    // 1. Check Authentication (Basic Auth Middleware usually handles this for /admin)
    // For now, simpler implementation as requested.

    // 2. Parse Query Params
    const searchParams = request.nextUrl.searchParams;
    const pid = searchParams.get('prolific_pid');

    if (!pid) {
        return NextResponse.json({ error: 'Missing prolific_pid parameter' }, { status: 400 });
    }

    // 3. Setup Supabase
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY!;

    if (!supabaseUrl || !supabaseKey || !elevenLabsKey) {
        return NextResponse.json({ error: 'Server misconfiguration (missing env vars)' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // 4. Fetch Participant
        const { data: participant, error: fetchError } = await supabase
            .from('participants')
            .select('*')
            .eq('prolific_pid', pid)
            .single();

        if (fetchError || !participant) {
            return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
        }

        // 5. Generate Stimulus Text (if missing)
        let finalStimulusText = participant.stimulus_text;
        if (!finalStimulusText) {
            finalStimulusText = getStimulusText(participant);
            // Save it
            await supabase
                .from('participants')
                .update({ stimulus_text: finalStimulusText })
                .eq('prolific_pid', pid);
        }

        // 6. Generate Audio
        const audioBuffer = await generateAudio(finalStimulusText, elevenLabsKey);

        // 7. Upload
        const audioPath = `${pid}_${participant.condition}.mp3`;
        await uploadAudio(audioPath, audioBuffer);

        // 8. Update Status
        await supabase
            .from('participants')
            .update({
                audio_status: 'under_review',
                qc_status: 'under_review',
                audio_path: audioPath,
                audio_generated_at: new Date().toISOString(),
                audio_error: null,
            })
            .eq('prolific_pid', pid);

        return NextResponse.json({
            success: true,
            message: `Audio generated for ${pid}`,
            path: audioPath
        });

    } catch (error: any) {
        console.error('Single generation error:', error);
        return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
    }
}
