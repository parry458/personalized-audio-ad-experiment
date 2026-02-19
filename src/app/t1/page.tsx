/**
 * T1 Page - Complete Study Flow
 * ==============================
 *
 * Flow: Audio Exposure → Relevance → Intrusiveness → Attitude → Purchase Intent → Privacy → Submit
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, Suspense } from 'react';
import { T1_ITEMS } from '@/config/t1_items';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Clock, Headphones, ChevronRight, Loader2 } from 'lucide-react';

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
// PROGRESS INDICATOR (same style as T0)
// ============================================

function StepIndicator({ current, total }: { current: number; total: number }) {
    return (
        <div className="w-full space-y-3">
            <p className="text-center text-base font-medium text-gray-500">
                Step {current} of {total}
            </p>
            <div className="flex gap-2">
                {Array.from({ length: total }, (_, i) => (
                    <div
                        key={i}
                        className={`h-2 flex-1 rounded-full transition-colors duration-300 ${i < current ? 'bg-blue-600' : 'bg-gray-200'}`}
                    />
                ))}
            </div>
        </div>
    );
}

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
    // RENDER: LOADING
    // ============================================

    if (step === 'loading') {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="flex items-center gap-3 text-lg text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Loading your study...
                </div>
            </main>
        );
    }

    // ============================================
    // RENDER: ERROR
    // ============================================

    if (step === 'error') {
        return (
            <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl mx-auto space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-3xl font-semibold">Study Part 2</CardTitle>
                            <CardDescription className="text-base">Audio exposure &amp; survey</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Alert variant="destructive">
                                <AlertCircle className="h-5 w-5" />
                                <AlertTitle className="text-base">Unable to proceed</AlertTitle>
                                <AlertDescription className="text-base">{errorMessage}</AlertDescription>
                            </Alert>
                        </CardContent>
                        <CardFooter>
                            <Button
                                variant="outline"
                                size="lg"
                                className="text-base"
                                onClick={() => window.location.reload()}
                            >
                                Retry
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </main>
        );
    }

    // ============================================
    // RENDER: COMPLETE
    // ============================================

    if (step === 'complete') {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <CheckCircle2 className="h-7 w-7 text-green-600" />
                            Thank You!
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-lg text-muted-foreground">
                            Your responses have been recorded successfully.
                        </p>
                        <p className="text-base text-muted-foreground">
                            You may now close this window or return to Prolific.
                        </p>
                    </CardContent>
                </Card>
            </main>
        );
    }

    // ============================================
    // RENDER: SUBMITTING
    // ============================================

    if (step === 'submitting') {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="flex items-center gap-3 text-lg text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Submitting your responses...
                </div>
            </main>
        );
    }

    // ============================================
    // RENDER: AUDIO STEP
    // ============================================

    if (step === 'audio') {
        return (
            <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="text-center space-y-1">
                        <h1 className="text-3xl font-semibold text-gray-900">Study Part 2</h1>
                        <p className="text-base text-muted-foreground">Audio exposure &amp; survey</p>
                    </div>

                    <StepIndicator current={1} total={totalSteps} />

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl flex items-center gap-2">
                                <Headphones className="h-6 w-6" />
                                Listen to the Audio
                            </CardTitle>
                            <CardDescription className="text-base">
                                Please listen carefully to the audio clip below.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <audio
                                ref={audioRef}
                                controls
                                src={audioUrl!}
                                onTimeUpdate={handleTimeUpdate}
                                onEnded={handleAudioEnded}
                                className="w-full"
                            />
                            <p className="text-sm text-muted-foreground italic">
                                Please listen fully before continuing.
                            </p>
                        </CardContent>
                        <CardFooter>
                            <Button
                                size="lg"
                                className="w-full text-lg py-6"
                                onClick={handleContinue}
                                disabled={!canContinueAudio}
                            >
                                Continue
                                <ChevronRight className="ml-2 h-5 w-5" />
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </main>
        );
    }

    // ============================================
    // RENDER: SURVEY STEPS
    // ============================================

    const currentScale = activeScales[currentScaleIndex];
    const activeItems = currentScale.items.filter(item => item.active);
    const isLikert = currentScale.type === 'likert';
    const isLastScale = currentScaleIndex >= activeScales.length - 1;

    return (
        <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center space-y-1">
                    <h1 className="text-3xl font-semibold text-gray-900">Study Part 2</h1>
                    <p className="text-base text-muted-foreground">Audio exposure &amp; survey</p>
                </div>

                <StepIndicator current={currentScaleIndex + 2} total={totalSteps} />

                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">{currentScale.scale_label}</CardTitle>
                        <CardDescription className="text-base">
                            {isLikert
                                ? 'Please indicate how much you agree with the following statements.'
                                : 'Please rate on the following scales.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {activeItems.map((item) => (
                            <div key={item.item_id} className="pb-6 border-b border-gray-100 last:border-0 last:pb-0">
                                {isLikert ? (
                                    <>
                                        <p className="text-base font-medium mb-4">
                                            {(item as { text: string }).text}
                                        </p>
                                        <div className="flex items-center gap-1 sm:gap-2 justify-between">
                                            <span className="text-xs sm:text-sm text-muted-foreground min-w-[60px] sm:min-w-[80px] text-center leading-tight">
                                                {T1_ITEMS.likert.labels["1"]}
                                            </span>
                                            {[1, 2, 3, 4, 5, 6, 7].map(val => (
                                                <label
                                                    key={val}
                                                    className={`flex flex-col items-center gap-1 cursor-pointer px-1 sm:px-2 py-2 rounded-lg transition-colors ${answers[item.item_id] === val ? 'bg-blue-50 ring-2 ring-blue-500' : 'hover:bg-gray-50'}`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name={item.item_id}
                                                        value={val}
                                                        checked={answers[item.item_id] === val}
                                                        onChange={() => handleAnswerChange(item.item_id, val)}
                                                        className="sr-only"
                                                    />
                                                    <span className={`text-sm font-medium ${answers[item.item_id] === val ? 'text-blue-700' : 'text-gray-600'}`}>
                                                        {val}
                                                    </span>
                                                </label>
                                            ))}
                                            <span className="text-xs sm:text-sm text-muted-foreground min-w-[60px] sm:min-w-[80px] text-center leading-tight">
                                                {T1_ITEMS.likert.labels["7"]}
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {(item as { prompt?: string }).prompt && (
                                            <p className="text-base font-medium mb-4">
                                                {(item as { prompt?: string }).prompt}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-1 sm:gap-2 justify-between">
                                            <span className="text-xs sm:text-sm text-muted-foreground min-w-[60px] sm:min-w-[80px] text-center leading-tight">
                                                {(item as { left: string }).left}
                                            </span>
                                            {[1, 2, 3, 4, 5, 6, 7].map(val => (
                                                <label
                                                    key={val}
                                                    className={`flex flex-col items-center gap-1 cursor-pointer px-1 sm:px-2 py-2 rounded-lg transition-colors ${answers[item.item_id] === val ? 'bg-blue-50 ring-2 ring-blue-500' : 'hover:bg-gray-50'}`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name={item.item_id}
                                                        value={val}
                                                        checked={answers[item.item_id] === val}
                                                        onChange={() => handleAnswerChange(item.item_id, val)}
                                                        className="sr-only"
                                                    />
                                                    <span className={`text-sm font-medium ${answers[item.item_id] === val ? 'text-blue-700' : 'text-gray-600'}`}>
                                                        {val}
                                                    </span>
                                                </label>
                                            ))}
                                            <span className="text-xs sm:text-sm text-muted-foreground min-w-[60px] sm:min-w-[80px] text-center leading-tight">
                                                {(item as { right: string }).right}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </CardContent>
                    <CardFooter>
                        <Button
                            size="lg"
                            className="w-full text-lg py-6"
                            onClick={handleContinue}
                            disabled={!isCurrentScaleComplete()}
                        >
                            {isLastScale ? 'Submit' : 'Continue'}
                            {!isLastScale && <ChevronRight className="ml-2 h-5 w-5" />}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </main>
    );
}

// ============================================
// EXPORT WITH SUSPENSE
// ============================================

export default function T1Page() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex items-center gap-3 text-lg text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Loading...
                </div>
            </div>
        }>
            <T1Content />
        </Suspense>
    );
}
