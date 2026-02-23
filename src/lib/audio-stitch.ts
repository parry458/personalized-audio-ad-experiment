/**
 * Audio Stitching Utility
 * =======================
 * 
 * Concatenates podcast intro/outro MP3s around a generated TTS ad MP3
 * using ffmpeg. All inputs are first normalized to uniform WAV (PCM s16le,
 * 44100 Hz, stereo) before concatenation to avoid glitches from mismatched
 * formats. The final output is encoded as MP3 at 160 kbps.
 * 
 * Uses os.tmpdir() for Vercel compatibility (/tmp on serverless).
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const execFileAsync = promisify(execFile);

// Paths to static podcast snippets (relative to project root)
const PODCAST_BEFORE = path.resolve(process.cwd(), 'assets/podcast/podcast_before.mp3');
const PODCAST_AFTER = path.resolve(process.cwd(), 'assets/podcast/podcast_after.mp3');

/**
 * Get the path to the ffmpeg binary.
 * Uses ffmpeg-static if available, otherwise falls back to system ffmpeg.
 */
function getFfmpegPath(): string {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require('ffmpeg-static');
    } catch {
        return 'ffmpeg';
    }
}

/** Normalize an MP3 (file or buffer) to a uniform WAV file. */
async function normalizeToWav(ffmpeg: string, input: string, outputWav: string): Promise<void> {
    await execFileAsync(ffmpeg, [
        '-y',
        '-i', input,
        '-ac', '2',
        '-ar', '44100',
        '-c:a', 'pcm_s16le',
        outputWav,
    ]);
}

/**
 * Stitch podcast intro/outro around an ad MP3 buffer.
 * 
 * Pipeline:
 *   1. Normalize all three inputs to WAV (PCM s16le, 44100 Hz, stereo)
 *   2. Concatenate WAVs via concat demuxer
 *   3. Encode final output as MP3 (160 kbps)
 * 
 * Uses os.tmpdir() for Vercel compatibility (writes to /tmp on serverless).
 * 
 * @param adBuffer - The raw MP3 buffer of the generated ad
 * @param outputName - Name for the output file (e.g., "low_final.mp3")
 * @returns The stitched MP3 as a Buffer
 */
export async function stitchWithPodcast(adBuffer: Buffer, outputName: string): Promise<Buffer> {
    // Validate podcast assets exist
    if (!fs.existsSync(PODCAST_BEFORE)) {
        throw new Error(`Missing podcast intro: ${PODCAST_BEFORE}`);
    }
    if (!fs.existsSync(PODCAST_AFTER)) {
        throw new Error(`Missing podcast outro: ${PODCAST_AFTER}`);
    }

    const ffmpeg = getFfmpegPath();

    // Create unique temp directory under os.tmpdir() (Vercel-safe: /tmp)
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-stitch-'));

    // Temp file paths inside the unique work directory
    const adMp3Path = path.join(workDir, 'ad.mp3');
    const beforeWav = path.join(workDir, 'before.wav');
    const adWav = path.join(workDir, 'ad.wav');
    const afterWav = path.join(workDir, 'after.wav');
    const listPath = path.join(workDir, 'list.txt');
    const outputPath = path.join(workDir, outputName);

    try {
        // 1. Write ad buffer to temp MP3
        fs.writeFileSync(adMp3Path, adBuffer);

        // 2. Normalize all three segments to uniform WAV
        console.log('     🔄 Normalizing audio segments (44100 Hz, stereo, PCM s16le)...');
        await Promise.all([
            normalizeToWav(ffmpeg, PODCAST_BEFORE, beforeWav),
            normalizeToWav(ffmpeg, adMp3Path, adWav),
            normalizeToWav(ffmpeg, PODCAST_AFTER, afterWav),
        ]);

        // 3. Create concat demuxer list (absolute paths for safety)
        const listContent = [
            `file '${beforeWav}'`,
            `file '${adWav}'`,
            `file '${afterWav}'`,
        ].join('\n');
        fs.writeFileSync(listPath, listContent);

        // 4. Concatenate WAVs and encode to MP3
        await execFileAsync(ffmpeg, [
            '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', listPath,
            '-c:a', 'libmp3lame',
            '-b:a', '160k',
            '-ar', '44100',
            '-ac', '2',
            outputPath,
        ]);

        // 5. Read stitched output
        const stitchedBuffer = fs.readFileSync(outputPath);
        console.log(`     🎧 Stitched audio: ${(stitchedBuffer.length / 1024).toFixed(0)} KB`);

        return stitchedBuffer;

    } finally {
        // Cleanup entire work directory
        try {
            fs.rmSync(workDir, { recursive: true, force: true });
        } catch { /* ignore cleanup errors */ }
    }
}
