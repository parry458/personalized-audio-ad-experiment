/**
 * Audio Stitching Utility
 * =======================
 * 
 * Concatenates podcast intro/outro MP3s around a generated TTS ad MP3
 * using ffmpeg's concat demuxer.
 * 
 * Flow: podcast_before.mp3 + ad.mp3 + podcast_after.mp3 → final.mp3
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execFileAsync = promisify(execFile);

// Paths to static podcast snippets (relative to project root)
const PODCAST_BEFORE = path.resolve(process.cwd(), 'assets/podcast/podcast_before.mp3');
const PODCAST_AFTER = path.resolve(process.cwd(), 'assets/podcast/podcast_after.mp3');

// Temp directory for intermediate files
const TEMP_DIR = path.resolve(process.cwd(), '.tmp/audio');

/**
 * Get the path to the ffmpeg binary.
 * Uses ffmpeg-static if available, otherwise falls back to system ffmpeg.
 */
function getFfmpegPath(): string {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require('ffmpeg-static');
    } catch {
        return 'ffmpeg'; // fallback to system ffmpeg
    }
}

/**
 * Ensure the temp directory exists.
 */
function ensureTempDir(): void {
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
}

/**
 * Stitch podcast intro/outro around an ad MP3 buffer.
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

    ensureTempDir();

    const ffmpeg = getFfmpegPath();
    const timestamp = Date.now();
    const adTempPath = path.join(TEMP_DIR, `ad_${timestamp}.mp3`);
    const listPath = path.join(TEMP_DIR, `list_${timestamp}.txt`);
    const outputPath = path.join(TEMP_DIR, outputName);

    try {
        // 1. Write ad buffer to temp file
        fs.writeFileSync(adTempPath, adBuffer);

        // 2. Create concat demuxer list file
        const listContent = [
            `file '${PODCAST_BEFORE}'`,
            `file '${adTempPath}'`,
            `file '${PODCAST_AFTER}'`,
        ].join('\n');
        fs.writeFileSync(listPath, listContent);

        // 3. Try concat with stream copy first (fastest, no re-encode)
        try {
            await execFileAsync(ffmpeg, [
                '-y',
                '-f', 'concat',
                '-safe', '0',
                '-i', listPath,
                '-c', 'copy',
                outputPath,
            ]);
        } catch {
            // 4. Fallback: re-encode if stream copy fails
            console.log('     ⚠️  Stream copy failed, re-encoding...');
            await execFileAsync(ffmpeg, [
                '-y',
                '-f', 'concat',
                '-safe', '0',
                '-i', listPath,
                '-c:a', 'libmp3lame',
                '-q:a', '3',
                outputPath,
            ]);
        }

        // 5. Read stitched output
        const stitchedBuffer = fs.readFileSync(outputPath);
        console.log(`     🎧 Stitched audio: ${(stitchedBuffer.length / 1024).toFixed(0)} KB`);

        return stitchedBuffer;

    } finally {
        // Cleanup temp files
        for (const f of [adTempPath, listPath, outputPath]) {
            try { fs.unlinkSync(f); } catch { /* ignore */ }
        }
    }
}
