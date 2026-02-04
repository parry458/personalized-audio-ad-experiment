/**
 * T1 Page - Complete Study Flow
 * ==============================
 * 
 * Flow: Audio Exposure → Relevance → Intrusiveness → Attitude → Purchase Intent → Privacy → Submit
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, Suspense } from 'react';
import { T1_ITEMS, LikertScale, SemanticDifferentialScale } from '@/config/t1_items';

// ============================================
// TYPES
// ============================================

interface AudioResponse {
    ok: boolean;
    found?: boolean;
    status?: string | null;
    audio_url?: string | null;
    error?: string;
}

type Step = 'loading' | 'audio' | 'survey' | 'submitting' | 'complete' | 'error';

// ============================================
// MAIN COMPONENT
// ============================================

function T1Content() {
    const searchParams = useSearchParams();
    const prolificPid = searchParams.get('PROLIFIC_PID');

    // State
    const [step, setStep] = useState<Step>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [currentScaleIndex, setCurrentScaleIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [canContinueAudio, setCanContinueAudio] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const playTimeRef = useRef(0);

    // Get active scales (only those with at least one active item)
    const activeScales = T1_ITEMS.scales.filter(scale =>
        scale.items.some(item => item.active)
    );

    const totalSteps = activeScales.length + 1; // +1 for audio step

    // Fetch audio on mount
    useEffect(() => {
        if (!prolificPid) {
            setErrorMessage('Missing PROLIFIC_PID');
            setStep('error');
            return;
        }

        const fetchAudio = async () => {
            try {
                const response = await fetch(`/api/t1/get-audio?prolific_pid=${encodeURIComponent(prolificPid)}`);
                const data: AudioResponse = await response.json();

                if (!data.ok) {
                    setErrorMessage(data.error || 'Failed to fetch audio');
                    setStep('error');
                    return;
                }

                if (data.found === false) {
                    setErrorMessage('Participant not found. Please complete part 1 first.');
                    setStep('error');
                    return;
                }

                // Handle different audio statuses
                if (data.status === 'pending') {
                    setErrorMessage('Your audio is still being generated. Please try again later.');
                    setStep('error');
                    return;
                }

                if (data.status === 'qc_pending') {
                    setErrorMessage('Your audio is under review. Please try again later.');
                    setStep('error');
                    return;
                }

                if (data.status !== 'ready' || !data.audio_url) {
                    setErrorMessage('Your audio is not available.');
                    setStep('error');
                    return;
                }

                setAudioUrl(data.audio_url);
                setStep('audio');
            } catch (error) {
                console.error('Error fetching audio:', error);
                setErrorMessage('Failed to load audio');
                setStep('error');
            }
        };

        fetchAudio();
    }, [prolificPid]);

    // Audio playback tracking
    const handleTimeUpdate = () => {
        if (audioRef.current) {
            playTimeRef.current = audioRef.current.currentTime;
            if (playTimeRef.current >= 2 && !canContinueAudio) {
                setCanContinueAudio(true);
            }
        }
    };

    const handleAudioEnded = () => {
        setCanContinueAudio(true);
    };

    // Check if current scale is complete
    const isCurrentScaleComplete = () => {
        if (step !== 'survey') return false;
        const scale = activeScales[currentScaleIndex];
        const activeItems = scale.items.filter(item => item.active);
        return activeItems.every(item => answers[item.item_id] !== undefined);
    };

    // Handle answer change
    const handleAnswerChange = (itemId: string, value: number) => {
        setAnswers(prev => ({ ...prev, [itemId]: value }));
    };

    // Navigate to next scale or submit
    const handleContinue = async () => {
        if (step === 'audio') {
            setStep('survey');
            return;
        }

        if (step === 'survey') {
            if (currentScaleIndex < activeScales.length - 1) {
                setCurrentScaleIndex(prev => prev + 1);
                window.scrollTo(0, 0);
            } else {
                await handleSubmit();
            }
        }
    };

    // Submit responses
    const handleSubmit = async () => {
        setStep('submitting');

        try {
            const response = await fetch('/api/t1/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prolific_pid: prolificPid,
                    response_payload: {
                        answers,
                        completed_at: new Date().toISOString(),
                    },
                }),
            });

            const data = await response.json();

            if (!data.ok) {
                setErrorMessage(data.error || 'Submission failed');
                setStep('error');
                return;
            }

            setStep('complete');
        } catch (error) {
            console.error('Submit error:', error);
            setErrorMessage('Failed to submit responses');
            setStep('error');
        }
    };

    // ============================================
    // RENDER STATES
    // ============================================

    if (step === 'loading') {
        return <main style={styles.main}><p>Loading...</p></main>;
    }

    if (step === 'error') {
        return (
            <main style={styles.main}>
                <h1>T1 - Study Part 2</h1>
                <div style={styles.errorBox}>{errorMessage}</div>
            </main>
        );
    }

    if (step === 'complete') {
        return (
            <main style={styles.main}>
                <h1>Thank You!</h1>
                <p style={styles.successBox}>Your responses have been recorded successfully.</p>
                <p>You may now close this window or return to Prolific.</p>
            </main>
        );
    }

    if (step === 'submitting') {
        return <main style={styles.main}><p>Submitting your responses...</p></main>;
    }

    // ============================================
    // AUDIO STEP
    // ============================================

    if (step === 'audio') {
        return (
            <main style={styles.main}>
                <h1>T1 - Study Part 2</h1>
                <p style={styles.progress}>Step 1 of {totalSteps}</p>

                <section style={styles.section}>
                    <h2>🎧 Listen to the Advertisement</h2>
                    <p>Please listen carefully to the advertisement below.</p>

                    <audio
                        ref={audioRef}
                        controls
                        src={audioUrl!}
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={handleAudioEnded}
                        style={styles.audio}
                    />

                    <button
                        onClick={handleContinue}
                        disabled={!canContinueAudio}
                        style={{
                            ...styles.button,
                            ...(canContinueAudio ? {} : styles.buttonDisabled),
                        }}
                    >
                        Continue
                    </button>
                </section>
            </main>
        );
    }

    // ============================================
    // SURVEY STEPS
    // ============================================

    const currentScale = activeScales[currentScaleIndex];
    const activeItems = currentScale.items.filter(item => item.active);
    const isLikert = currentScale.type === 'likert';

    return (
        <main style={styles.main}>
            <h1>T1 - Study Part 2</h1>
            <p style={styles.progress}>
                Step {currentScaleIndex + 2} of {totalSteps}
            </p>

            <section style={styles.section}>
                <h2>{currentScale.scale_label}</h2>
                <p style={styles.instruction}>
                    {isLikert
                        ? 'Please indicate how much you agree with the following statements.'
                        : 'Please rate on the following scales.'}
                </p>

                {activeItems.map((item) => (
                    <div key={item.item_id} style={styles.questionBlock}>
                        {isLikert ? (
                            // Likert scale item
                            <>
                                <p style={styles.questionText}>
                                    {(item as { text: string }).text}
                                </p>
                                <div style={styles.scaleRow}>
                                    <span style={styles.scaleLabel}>
                                        {T1_ITEMS.likert.labels["1"]}
                                    </span>
                                    {[1, 2, 3, 4, 5, 6, 7].map(val => (
                                        <label key={val} style={styles.radioLabel}>
                                            <input
                                                type="radio"
                                                name={item.item_id}
                                                value={val}
                                                checked={answers[item.item_id] === val}
                                                onChange={() => handleAnswerChange(item.item_id, val)}
                                            />
                                            <span>{val}</span>
                                        </label>
                                    ))}
                                    <span style={styles.scaleLabel}>
                                        {T1_ITEMS.likert.labels["7"]}
                                    </span>
                                </div>
                            </>
                        ) : (
                            // Semantic differential item
                            <>
                                {(item as { prompt?: string }).prompt && (
                                    <p style={styles.questionText}>
                                        {(item as { prompt?: string }).prompt}
                                    </p>
                                )}
                                <div style={styles.scaleRow}>
                                    <span style={styles.scaleLabel}>
                                        {(item as { left: string }).left}
                                    </span>
                                    {[1, 2, 3, 4, 5, 6, 7].map(val => (
                                        <label key={val} style={styles.radioLabel}>
                                            <input
                                                type="radio"
                                                name={item.item_id}
                                                value={val}
                                                checked={answers[item.item_id] === val}
                                                onChange={() => handleAnswerChange(item.item_id, val)}
                                            />
                                            <span>{val}</span>
                                        </label>
                                    ))}
                                    <span style={styles.scaleLabel}>
                                        {(item as { right: string }).right}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                ))}

                <button
                    onClick={handleContinue}
                    disabled={!isCurrentScaleComplete()}
                    style={{
                        ...styles.button,
                        ...(isCurrentScaleComplete() ? {} : styles.buttonDisabled),
                    }}
                >
                    {currentScaleIndex < activeScales.length - 1 ? 'Continue' : 'Submit'}
                </button>
            </section>
        </main>
    );
}

// ============================================
// STYLES
// ============================================

const styles: { [key: string]: React.CSSProperties } = {
    main: {
        padding: '40px 20px',
        maxWidth: '700px',
        margin: '0 auto',
        fontFamily: 'system-ui, sans-serif',
    },
    progress: {
        color: '#666',
        fontSize: '14px',
        marginBottom: '20px',
    },
    section: {
        marginTop: '20px',
    },
    instruction: {
        color: '#555',
        marginBottom: '24px',
        fontStyle: 'italic',
    },
    audio: {
        width: '100%',
        marginBottom: '20px',
    },
    questionBlock: {
        marginBottom: '28px',
        paddingBottom: '20px',
        borderBottom: '1px solid #eee',
    },
    questionText: {
        marginBottom: '12px',
        fontWeight: 500,
    },
    scaleRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
    },
    scaleLabel: {
        fontSize: '12px',
        color: '#666',
        minWidth: '100px',
        textAlign: 'center',
    },
    radioLabel: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        cursor: 'pointer',
        padding: '4px 8px',
    },
    button: {
        background: '#0070f3',
        color: 'white',
        padding: '12px 32px',
        fontSize: '16px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        marginTop: '20px',
    },
    buttonDisabled: {
        background: '#ccc',
        cursor: 'not-allowed',
    },
    errorBox: {
        color: '#d32f2f',
        background: '#ffebee',
        padding: '16px',
        borderRadius: '8px',
    },
    successBox: {
        color: '#2e7d32',
        background: '#e8f5e9',
        padding: '16px',
        borderRadius: '8px',
    },
};

// ============================================
// EXPORT WITH SUSPENSE
// ============================================

export default function T1Page() {
    return (
        <Suspense fallback={<div style={{ padding: '40px' }}>Loading...</div>}>
            <T1Content />
        </Suspense>
    );
}
