/**
 * Stimuli Preview Page
 * ====================
 * 
 * Simple page to play the four condition audio files from /public/stimuli/.
 */

const STIMULI = [
    { label: 'LOW', file: '/stimuli/low.mp3' },
    { label: 'MEDIUM', file: '/stimuli/medium.mp3' },
    { label: 'HIGH_A', file: '/stimuli/high_a.mp3' },
    { label: 'HIGH_B', file: '/stimuli/high_b.mp3' },
];

export default function StimuliPage() {
    return (
        <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center space-y-1">
                    <h1 className="text-3xl font-semibold text-gray-900">Stimuli Preview</h1>
                    <p className="text-base text-gray-500">
                        Listen to the four condition audio files below.
                    </p>
                </div>

                {STIMULI.map(({ label, file }) => (
                    <div
                        key={label}
                        className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-3"
                    >
                        <h2 className="text-xl font-semibold text-gray-800">{label}</h2>
                        <audio controls preload="none" className="w-full">
                            <source src={file} type="audio/mpeg" />
                            Your browser does not support the audio element.
                        </audio>
                        <p className="text-sm text-gray-400 font-mono">{file}</p>
                    </div>
                ))}
            </div>
        </main>
    );
}
