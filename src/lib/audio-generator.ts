
import { createClient } from '@supabase/supabase-js';

// Configuration
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const VOICE_ID = '10Oz6dRJfcETCvViPSmk'; // Jon Quintero
const MODEL_ID = 'eleven_turbo_v2_5';

// Voice Settings (Natural Ad Realism)
const VOICE_SETTINGS = {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    use_speaker_boost: true,
    speed: 0.89
};

// Lazy initialization of Supabase client to ensure env vars are loaded
let supabaseInstance: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
    if (supabaseInstance) return supabaseInstance;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
        supabaseInstance = createClient(supabaseUrl, supabaseKey);
        return supabaseInstance;
    }
    return null;
}


export async function generateAudio(text: string, apiKey: string): Promise<Buffer> {
    if (!apiKey) throw new Error("Missing ElevenLabs API Key");

    const response = await fetch(`${ELEVENLABS_API_URL}/${VOICE_ID}`, {
        method: 'POST',
        headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
        },
        body: JSON.stringify({
            text,
            model_id: MODEL_ID,
            voice_settings: VOICE_SETTINGS,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

export async function uploadAudio(path: string, buffer: Buffer): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase client not initialized (missing env vars)");

    const { error } = await supabase
        .storage
        .from('ads-audio')
        .upload(path, buffer, {
            contentType: 'audio/mpeg',
            upsert: true,
        });

    if (error) {
        throw new Error(`Supabase upload error: ${error.message}`);
    }
}
