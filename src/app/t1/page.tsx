/**
 * T1 Page - Complete Study Flow
 * ==============================
 *
 * Flow: Consent → Screener → Audio Exposure → Relevance → Intrusiveness → Attitude → Purchase Intent → Privacy → Submit
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, Suspense } from 'react';
import { T1_ITEMS } from '@/config/t1_items';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle, CheckCircle2, Clock, Headphones, ChevronRight, ChevronLeft, Loader2, Play, Volume2 } from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface AudioResponse {
    ok: boolean;
    found?: boolean;
    status?: string | null;
    audio_url?: string | null;
    error?: string;
    already_completed_t1?: boolean;
}

type Step = 'loading' | 'consent' | 'screener' | 'screen_failed' | 'audio_instructions' | 'audio' | 'survey' | 'podcast_frequency' | 'submitting' | 'complete' | 'error' | 'already_completed';

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
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [canContinueAudio, setCanContinueAudio] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const playTimeRef = useRef(0);
    const startTimeRef = useRef(Date.now());

    // Consent + Screener state
    const [consentAnswer, setConsentAnswer] = useState<string>('');
    const [screenerAnswers, setScreenerAnswers] = useState<Record<string, string>>({});

    // Custom audio player state
    const [audioPlaying, setAudioPlaying] = useState(false);
    const [audioFinished, setAudioFinished] = useState(false);
    const [audioProgress, setAudioProgress] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);

    // Podcast frequency state
    const [podcastFrequency, setPodcastFrequency] = useState<string>('');

    // Get active scales (only those with at least one active item)
    const activeScales = T1_ITEMS.scales.filter(scale =>
        scale.items.some(item => item.active)
    );

    const totalSteps = activeScales.length + 2; // +1 for audio step, +1 for podcast frequency

    // Fetch audio on mount
    useEffect(() => {
        if (!prolificPid) {
            setErrorMessage('Missing PROLIFIC_PID');
            setStep('error');
            return;
        }

        const fetchAudio = async () => {
            try {
                // Check T1 screener failure first
                const screenRes = await fetch(`/api/t1/screener?prolific_pid=${encodeURIComponent(prolificPid)}`);
                const screenData = await screenRes.json();
                if (screenData.t1_screen_failed) {
                    setStep('screen_failed');
                    return;
                }

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

                // Check if T1 already completed
                if (data.already_completed_t1) {
                    setStep('already_completed');
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
                setStep('consent');
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
            setAudioProgress(audioRef.current.currentTime);
        }
    };

    const handleAudioEnded = () => {
        setCanContinueAudio(true);
        setAudioPlaying(false);
        setAudioFinished(true);
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setAudioDuration(audioRef.current.duration);
        }
    };

    const handlePlayAudio = () => {
        if (audioRef.current && !audioFinished) {
            audioRef.current.play();
            setAudioPlaying(true);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
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
        // Clear inline error for this item
        setFieldErrors(prev => {
            if (!prev[itemId]) return prev;
            const next = { ...prev };
            delete next[itemId];
            return next;
        });
    };

    // Handle screener answer change
    const handleScreenerChange = (field: string, value: string) => {
        setScreenerAnswers(prev => ({ ...prev, [field]: value }));
        setFieldErrors(prev => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const scrollToFirstError = () => {
        setTimeout(() => {
            const el = document.querySelector('[data-field-error="true"]');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
    };

    // Screener answer checking + failure recording
    const handleScreenerNext = async () => {
        const errors: Record<string, string> = {};
        const msg = 'Please answer this question before continuing.';
        if (!screenerAnswers.q1) errors.q1 = msg;
        if (!screenerAnswers.q2) errors.q2 = msg;
        if (!screenerAnswers.q3) errors.q3 = msg;

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            scrollToFirstError();
            return;
        }
        setFieldErrors({});

        // Check correctness — note Q1 answer is "A birthday cake" for T1
        const correct =
            screenerAnswers.q1 === 'A birthday cake' &&
            screenerAnswers.q2 === 'Yawning' &&
            screenerAnswers.q3 === 'Piano';

        if (!correct) {
            // Record failure permanently in participants table
            try {
                await fetch('/api/t1/screener', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prolific_pid: prolificPid }),
                });
            } catch { /* best effort */ }
            setStep('screen_failed');
            return;
        }

        setStep('audio_instructions');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Navigate to next scale or submit
    const handleContinue = async () => {
        if (step === 'audio') {
            setStep('survey');
            return;
        }

        if (step === 'survey') {
            // Validate current scale
            const scale = activeScales[currentScaleIndex];
            const activeItems = scale.items.filter(item => item.active);
            const errors: Record<string, string> = {};
            activeItems.forEach(item => {
                if (answers[item.item_id] === undefined) {
                    errors[item.item_id] = 'Please answer this question before continuing.';
                }
            });

            if (Object.keys(errors).length > 0) {
                setFieldErrors(errors);
                setTimeout(() => {
                    const el = document.querySelector('[data-field-error="true"]');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 50);
                return;
            }
            setFieldErrors({});

            if (currentScaleIndex < activeScales.length - 1) {
                setCurrentScaleIndex(prev => prev + 1);
                window.scrollTo(0, 0);
            } else {
                // Go to podcast frequency step instead of submitting directly
                setStep('podcast_frequency');
                setFieldErrors({});
                window.scrollTo(0, 0);
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
                        podcast_frequency: podcastFrequency,
                        completed_at: new Date().toISOString(),
                        duration_seconds: Math.round((Date.now() - startTimeRef.current) / 1000),
                    },
                }),
            });

            const data = await response.json();

            if (!data.ok) {
                // Check for duplicate submission
                if (data.already_completed_t1) {
                    setStep('already_completed');
                    return;
                }
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
    // RENDER: SCREEN FAILED (permanent)
    // ============================================

    if (step === 'screen_failed') {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center gap-2">
                            <AlertCircle className="h-6 w-6" />
                            Study Closed
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-lg">
                            Unfortunately, you are not eligible to continue with this study.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <p className="text-sm text-muted-foreground">Please return the submission on Prolific.</p>
                    </CardFooter>
                </Card>
            </main>
        );
    }

    // ============================================
    // RENDER: ALREADY COMPLETED
    // ============================================

    if (step === 'already_completed') {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-lg border-blue-200 bg-blue-50/50">
                    <CardHeader>
                        <CardTitle className="text-blue-700 flex items-center gap-2">
                            <CheckCircle2 className="h-6 w-6" />
                            Already Completed
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-blue-800">
                        <p>You have already completed Part 2 of this study.</p>
                        <p>You may now close this tab. Thank you!</p>
                    </CardContent>
                </Card>
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
    // RENDER: CONSENT (Step 0)
    // ============================================

    if (step === 'consent') {
        return (
            <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="text-center space-y-1">
                        <h1 className="text-3xl font-semibold text-gray-900">Study Part 2</h1>
                        <p className="text-base text-muted-foreground">Audio exposure &amp; survey</p>
                    </div>

                    <Card>
                        <CardContent className="space-y-4 pt-6 text-base leading-relaxed">
                            <p>
                                You are now taking part in part 2 of the study you started approximately one week ago.<br />
                                Part two will take ca. 3 minutes.<br />
                                For Part 2, you will need to be able to play audio on your device, ideally using headphones or earphones.
                            </p>

                            <p>
                                After submitting Part 2 you are eligible for the payment as specified on Prolific for completing the full study.
                            </p>

                            <p>
                                If you wish to withdraw before completing the study, you may simply close the survey window. Your responses will not be recorded if you withdraw before submitting them. Because the study is anonymous, it is not possible to remove your data after submission. You will still receive full payment in accordance with Prolific&apos;s policies.
                            </p>

                            <p>
                                <strong>Contact information:</strong><br />
                                If you have questions about this study, please contact:<br />
                                [Your Name]<br />
                                [Your University]<br />
                                [Your Email Address]
                            </p>

                            <hr className="my-4" />

                            <div className="space-y-3">
                                <Label className="text-lg leading-snug">
                                    Do you agree to participate in Part 2 of this study? *
                                </Label>
                                <RadioGroup
                                    value={consentAnswer}
                                    onValueChange={(value) => setConsentAnswer(value)}
                                >
                                    <div className="flex items-center space-x-3 py-1">
                                        <RadioGroupItem value="Yes" id="t1-consent-yes" />
                                        <Label htmlFor="t1-consent-yes" className="text-base font-normal cursor-pointer">Yes</Label>
                                    </div>
                                    <div className="flex items-center space-x-3 py-1">
                                        <RadioGroupItem value="No" id="t1-consent-no" />
                                        <Label htmlFor="t1-consent-no" className="text-base font-normal cursor-pointer">No</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                size="lg"
                                className="w-full text-lg py-6"
                                onClick={() => { setStep('screener'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                disabled={consentAnswer !== 'Yes'}
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
    // RENDER: SCREENER (Step 1)
    // ============================================

    if (step === 'screener') {
        return (
            <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="text-center space-y-1">
                        <h1 className="text-3xl font-semibold text-gray-900">Study Part 2</h1>
                        <p className="text-base text-muted-foreground">Audio exposure &amp; survey</p>
                    </div>

                    <Card>
                        <CardContent className="space-y-8 pt-6">
                            {/* Q1: Reading comprehension */}
                            <div className="space-y-3" data-field-error={!!fieldErrors.q1 || undefined}>
                                <p className="text-base leading-relaxed">
                                    Matt and Alex are best friends.<br />
                                    Alex&apos;s birthday is coming up soon.<br />
                                    Matt wanted to buy Alex a computer or a television, but they were too expensive.<br />
                                    Instead, he bought him a birthday cake.
                                </p>
                                <Label className="text-lg mt-4 block">What did Matt buy? *</Label>
                                <RadioGroup
                                    value={screenerAnswers.q1 || ''}
                                    onValueChange={(value) => handleScreenerChange('q1', value)}
                                >
                                    {['A computer', 'A television', 'A book', 'A birthday cake'].map(opt => (
                                        <div key={opt} className="flex items-center space-x-3 py-1">
                                            <RadioGroupItem value={opt} id={`t1sq1-${opt}`} />
                                            <Label htmlFor={`t1sq1-${opt}`} className="text-base font-normal cursor-pointer">{opt}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                                {fieldErrors.q1 && <p className="text-sm text-red-500">{fieldErrors.q1}</p>}
                            </div>

                            {/* Q2: Image recognition */}
                            <div className="space-y-3" data-field-error={!!fieldErrors.q2 || undefined}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/screener/yawning.jpg" alt="Character" className="rounded-lg max-w-xs mx-auto" />
                                <Label className="text-lg">What is the character above doing? *</Label>
                                <RadioGroup
                                    value={screenerAnswers.q2 || ''}
                                    onValueChange={(value) => handleScreenerChange('q2', value)}
                                >
                                    {['Yawning', 'Building', 'Dodging', 'Running'].map(opt => (
                                        <div key={opt} className="flex items-center space-x-3 py-1">
                                            <RadioGroupItem value={opt} id={`t1sq2-${opt}`} />
                                            <Label htmlFor={`t1sq2-${opt}`} className="text-base font-normal cursor-pointer">{opt}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                                {fieldErrors.q2 && <p className="text-sm text-red-500">{fieldErrors.q2}</p>}
                            </div>

                            {/* Q3: Audio recognition */}
                            <div className="space-y-3" data-field-error={!!fieldErrors.q3 || undefined}>
                                <Label className="text-lg">Which instrument can you hear in the audio example? *</Label>
                                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                                <audio controls className="w-full">
                                    <source src="/screener/audio.mp3" type="audio/mpeg" />
                                    Your browser does not support the audio element.
                                </audio>
                                <RadioGroup
                                    value={screenerAnswers.q3 || ''}
                                    onValueChange={(value) => handleScreenerChange('q3', value)}
                                >
                                    {['Piano', 'Drums', 'Guitar', 'Violin'].map(opt => (
                                        <div key={opt} className="flex items-center space-x-3 py-1">
                                            <RadioGroupItem value={opt} id={`t1sq3-${opt}`} />
                                            <Label htmlFor={`t1sq3-${opt}`} className="text-base font-normal cursor-pointer">{opt}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                                {fieldErrors.q3 && <p className="text-sm text-red-500">{fieldErrors.q3}</p>}
                            </div>
                        </CardContent>
                        <CardFooter className="flex gap-4">
                            <Button
                                variant="outline"
                                size="lg"
                                className="flex-1 text-lg py-6"
                                onClick={() => { setStep('consent'); setFieldErrors({}); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            >
                                <ChevronLeft className="mr-2 h-5 w-5" />
                                Back
                            </Button>
                            <Button
                                size="lg"
                                className="flex-1 text-lg py-6"
                                onClick={handleScreenerNext}
                            >
                                Next
                                <ChevronRight className="ml-2 h-5 w-5" />
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </main>
        );
    }

    // ============================================
    // RENDER: AUDIO INSTRUCTIONS (Step 2)
    // ============================================

    if (step === 'audio_instructions') {
        return (
            <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="text-center space-y-1">
                        <h1 className="text-3xl font-semibold text-gray-900">Study Part 2</h1>
                        <p className="text-base text-muted-foreground">Audio exposure &amp; survey</p>
                    </div>

                    <Card>
                        <CardContent className="space-y-4 pt-6 text-base leading-relaxed">
                            <p>
                                In the next step, you will be presented with an audio recording. The recording is an excerpt from a podcast and includes an advertising segment.
                            </p>
                            <p>
                                You will be able to listen to the entire audio file by clicking the play button. The recording can only be played once. Please listen carefully to the full audio.
                            </p>
                            <p>
                                After the audio has finished playing, you will be able to proceed to the next step.
                            </p>
                        </CardContent>
                        <CardFooter>
                            <Button
                                size="lg"
                                className="w-full text-lg py-6"
                                onClick={() => { setStep('audio'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
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
    // RENDER: AUDIO STEP (Custom Player)
    // ============================================

    if (step === 'audio') {
        const progressPct = audioDuration > 0 ? (audioProgress / audioDuration) * 100 : 0;

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
                                Please listen carefully to the full audio clip below. The recording can only be played once.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Hidden audio element */}
                            <audio
                                ref={audioRef}
                                src={audioUrl!}
                                onTimeUpdate={handleTimeUpdate}
                                onEnded={handleAudioEnded}
                                onLoadedMetadata={handleLoadedMetadata}
                                preload="metadata"
                                onContextMenu={(e) => e.preventDefault()}
                            />

                            {/* Custom player UI */}
                            <div className="flex flex-col items-center space-y-6 py-4">
                                {/* Large play button */}
                                <button
                                    onClick={handlePlayAudio}
                                    disabled={audioPlaying || audioFinished}
                                    className={`w-[70px] h-[70px] rounded-full flex items-center justify-center transition-all shadow-lg ${audioFinished
                                        ? 'bg-gray-300 cursor-not-allowed'
                                        : audioPlaying
                                            ? 'bg-blue-400 cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-700 cursor-pointer hover:shadow-xl hover:scale-105'
                                        }`}
                                    aria-label={audioFinished ? 'Playback complete' : audioPlaying ? 'Playing' : 'Play audio'}
                                >
                                    {audioFinished ? (
                                        <CheckCircle2 className="h-8 w-8 text-white" />
                                    ) : audioPlaying ? (
                                        <Volume2 className="h-8 w-8 text-white animate-pulse" />
                                    ) : (
                                        <Play className="h-8 w-8 text-white ml-1" />
                                    )}
                                </button>

                                {/* Status text */}
                                <p className={`text-sm font-medium ${audioFinished ? 'text-green-600' : audioPlaying ? 'text-blue-600' : 'text-muted-foreground'
                                    }`}>
                                    {audioFinished ? 'Playback complete' : audioPlaying ? 'Playing...' : 'Click to play'}
                                </p>

                                {/* Progress bar */}
                                <div className="w-full space-y-2">
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-300 ${audioFinished ? 'bg-green-500' : 'bg-blue-600'
                                                }`}
                                            style={{ width: `${progressPct}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>{formatTime(audioProgress)}</span>
                                        <span>{formatTime(audioDuration)}</span>
                                    </div>
                                </div>
                            </div>
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
    // RENDER: PODCAST FREQUENCY (Step 7)
    // ============================================

    if (step === 'podcast_frequency') {
        const podcastOptions = [
            'Never',
            'About once a year',
            'Twice a month or less',
            'Once a week',
            'Twice a week',
            'Daily',
            'Several times a day',
        ];

        const handlePodcastSubmit = async () => {
            if (!podcastFrequency) {
                setFieldErrors({ podcast_frequency: 'Please answer this question before continuing.' });
                scrollToFirstError();
                return;
            }
            setFieldErrors({});
            await handleSubmit();
        };

        return (
            <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="text-center space-y-1">
                        <h1 className="text-3xl font-semibold text-gray-900">Study Part 2</h1>
                        <p className="text-base text-muted-foreground">Audio exposure &amp; survey</p>
                    </div>

                    <StepIndicator current={totalSteps} total={totalSteps} />

                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="text-base">
                                Please answer the following question.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-2">
                            <div data-field-error={!!fieldErrors.podcast_frequency || undefined}>
                                <p className="text-base font-medium mb-3">
                                    How often do you listen to podcasts?
                                </p>
                                <RadioGroup
                                    value={podcastFrequency}
                                    onValueChange={(value) => {
                                        setPodcastFrequency(value);
                                        setFieldErrors(prev => {
                                            if (!prev.podcast_frequency) return prev;
                                            const next = { ...prev };
                                            delete next.podcast_frequency;
                                            return next;
                                        });
                                    }}
                                    className="space-y-2"
                                >
                                    {podcastOptions.map((option) => (
                                        <div key={option} className="flex items-center space-x-3">
                                            <RadioGroupItem value={option} id={`podcast-${option}`} />
                                            <Label htmlFor={`podcast-${option}`} className="text-base cursor-pointer">
                                                {option}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                                {fieldErrors.podcast_frequency && (
                                    <p className="text-sm text-red-500 mt-2">{fieldErrors.podcast_frequency}</p>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                size="lg"
                                className="w-full text-lg py-6"
                                onClick={handlePodcastSubmit}
                            >
                                Submit
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </main>
        );
    }

    // ============================================
    // RENDER: SURVEY STEPS (compact layout)
    // ============================================

    const currentScale = activeScales[currentScaleIndex];
    const activeItems = currentScale.items.filter(item => item.active);
    const isLikert = currentScale.type === 'likert';
    const isLastScale = currentScaleIndex >= activeScales.length - 1;
    const isCompactInline = isLikert || currentScale.scale_id === 'purchase_intention';

    // Per-scale container width
    const getContainerWidth = () => {
        if (currentScale.scale_id === 'intrusiveness') return 'max-w-3xl';
        return 'max-w-4xl';
    };

    // Per-scale instruction text
    const getInstructionText = () => {
        if (currentScale.scale_id === 'relevance' || currentScale.scale_id === 'intrusiveness') {
            return 'Please indicate how much you agree with the following statements based on the audio track you just listened to.';
        }
        if (isLikert) {
            return 'Please indicate how much you agree with the following statements.';
        }
        return 'Please rate on the following scales.';
    };

    // Compact header anchors
    const getLeftAnchor = () => {
        if (currentScale.scale_id === 'purchase_intention') return 'Very low';
        if (isLikert) return 'Strongly disagree';
        return '';
    };
    const getRightAnchor = () => {
        if (currentScale.scale_id === 'purchase_intention') return 'Very high';
        if (isLikert) return 'Strongly agree';
        return '';
    };

    return (
        <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className={`${getContainerWidth()} mx-auto space-y-6`}>
                {/* Header */}
                <div className="text-center space-y-1">
                    <h1 className="text-3xl font-semibold text-gray-900">Study Part 2</h1>
                    <p className="text-base text-muted-foreground">Audio exposure &amp; survey</p>
                </div>

                <StepIndicator current={currentScaleIndex + 2} total={totalSteps} />

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-base">
                            {getInstructionText()}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-0 pt-2">
                        {/* Compact anchor header (for likert and purchase_intention) */}
                        {isCompactInline && (
                            <div className="flex items-end pb-2 border-b border-gray-200 mb-1">
                                <div className="flex-1 min-w-0" />
                                <div className="flex items-end flex-shrink-0">
                                    <span className="w-[70px] text-center text-xs text-gray-900 font-medium leading-tight">
                                        {getLeftAnchor()}
                                    </span>
                                    {[1, 2, 3, 4, 5, 6, 7].map(val => (
                                        <span key={val} className="w-10 text-center text-xs font-medium text-gray-500">
                                            {val}
                                        </span>
                                    ))}
                                    <span className="w-[70px] text-center text-xs text-gray-900 font-medium leading-tight">
                                        {getRightAnchor()}
                                    </span>
                                </div>
                            </div>
                        )}

                        {activeItems.map((item, idx) => (
                            <div key={item.item_id} className={`py-2.5 ${idx < activeItems.length - 1 ? 'border-b border-gray-100' : ''}`} data-field-error={!!fieldErrors[item.item_id] || undefined}>
                                {isCompactInline ? (
                                    <div className="flex items-center">
                                        <p className="text-base font-medium flex-1 min-w-0 pr-3">
                                            {isLikert
                                                ? (item as { text: string }).text
                                                : (item as { prompt?: string }).prompt}
                                        </p>
                                        <div className="flex items-center flex-shrink-0">
                                            <span className="w-[70px]" />
                                            {[1, 2, 3, 4, 5, 6, 7].map(val => (
                                                <label
                                                    key={val}
                                                    className="flex items-center justify-center w-10 cursor-pointer"
                                                >
                                                    <input
                                                        type="radio"
                                                        name={item.item_id}
                                                        value={val}
                                                        checked={answers[item.item_id] === val}
                                                        onChange={() => handleAnswerChange(item.item_id, val)}
                                                        className="sr-only"
                                                    />
                                                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${answers[item.item_id] === val ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white hover:border-gray-400'}`}>
                                                        {answers[item.item_id] === val && <span className="w-2 h-2 rounded-full bg-white" />}
                                                    </span>
                                                </label>
                                            ))}
                                            <span className="w-[70px]" />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {(item as { prompt?: string }).prompt && (
                                            <p className="text-base font-medium mb-3">
                                                {(item as { prompt?: string }).prompt}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-1 sm:gap-2 justify-between">
                                            <span className="text-xs sm:text-sm text-gray-900 font-medium min-w-[50px] sm:min-w-[70px] text-center leading-tight">
                                                {(item as { left: string }).left}
                                            </span>
                                            {[1, 2, 3, 4, 5, 6, 7].map(val => (
                                                <label
                                                    key={val}
                                                    className={`flex flex-col items-center gap-1 cursor-pointer px-1 sm:px-2 py-1.5 rounded-lg transition-colors ${answers[item.item_id] === val ? 'bg-blue-50 ring-2 ring-blue-500' : 'hover:bg-gray-100 ring-1 ring-gray-200'}`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name={item.item_id}
                                                        value={val}
                                                        checked={answers[item.item_id] === val}
                                                        onChange={() => handleAnswerChange(item.item_id, val)}
                                                        className="sr-only"
                                                    />
                                                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${answers[item.item_id] === val ? 'border-blue-600 bg-blue-600' : 'border-gray-400 bg-white'}`}>
                                                        {answers[item.item_id] === val && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                    </span>
                                                    <span className={`text-sm font-medium ${answers[item.item_id] === val ? 'text-blue-700' : 'text-gray-600'}`}>
                                                        {val}
                                                    </span>
                                                </label>
                                            ))}
                                            <span className="text-xs sm:text-sm text-gray-900 font-medium min-w-[50px] sm:min-w-[70px] text-center leading-tight">
                                                {(item as { right: string }).right}
                                            </span>
                                        </div>
                                    </>
                                )}
                                {fieldErrors[item.item_id] && (
                                    <p className="text-sm text-red-500 mt-1">{fieldErrors[item.item_id]}</p>
                                )}
                            </div>
                        ))}
                    </CardContent>
                    <CardFooter>
                        <Button
                            size="lg"
                            className="w-full text-lg py-6"
                            onClick={handleContinue}
                        >
                            Continue
                            <ChevronRight className="ml-2 h-5 w-5" />
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </main>
    );

    // NOTE: podcast_frequency step is handled above before the survey render
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
