/**
 * T0 Page - First Part of Prolific Study (Multi-Step Flow)
 * ========================================================
 * 3-step form:
 *   Step 1: About You (Country, City, Age)
 *   Step 2: Weekly Activities (Past Category, Goal Category)
 *   Step 3: Media Habits (Podcasts, Notifications, Attention Check, etc.)
 *
 * - Screen-out logic for 'Other' country (unchanged)
 * - Supabase submit only on final step
 * - Progress indicator at top
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";

// ─── Progress Indicator ──────────────────────────────────────────────
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
                        className={`h-2 flex-1 rounded-full transition-colors duration-300 ${i < current ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
}

// ─── Main Content ────────────────────────────────────────────────────
function T0Content() {
    // URL Params
    const searchParams = useSearchParams();
    const prolificPid = searchParams.get('PROLIFIC_PID') || '';
    const studyId = searchParams.get('STUDY_ID') || '';
    const sessionId = searchParams.get('SESSION_ID') || '';

    // Step state
    const [step, setStep] = useState(1);

    // Form State (persisted across steps)
    const [formData, setFormData] = useState({
        country: '',
        city: '',
        age: '',
        past_category: '',
        past_category_other: '',
        goal_category: '',
        goal_category_other: '',
        podcast_frequency: '',
        podcast_genres: [] as string[],
        shortform_frequency: '',
        favorite_movie_genre: '',
        streaming_services: [] as string[],
        devices: [] as string[],
        notifications_per_day: '',
        multitask_audio_frequency: '',
        attention_check: '',
    });

    const [showOtherConfirm, setShowOtherConfirm] = useState(false);
    const [screenedOut, setScreenedOut] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Options
    const countries = ['UK', 'US', 'Other'];

    const pastCategories = [
        'Social media scrolling',
        'Streaming videos/TV',
        'Online shopping / browsing products',
        'Gaming',
        'Sports content',
        'Dating apps / messaging',
        'Other'
    ];

    const goalCategories = [
        'Getting organized / planning my week',
        'Studying / learning / exams',
        'Work productivity / getting tasks done',
        'Health routine (sleep, exercise, habits)',
        'Personal project / creative work',
        'Job search / applications / career planning',
        'Home/admin tasks (finances, paperwork, chores)',
        'Other'
    ];

    // ─── Handlers ────────────────────────────────────────────────
    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Country "Other" is now handled at step navigation, not here
    };

    // ─── Step Validation ─────────────────────────────────────────
    const validateStep = (s: number): string | null => {
        if (s === 1) {
            if (!formData.country) return 'Please select your country.';
            if (!formData.city.trim()) return 'Please enter your city.';
            const ageNum = parseInt(formData.age);
            if (!formData.age || isNaN(ageNum) || ageNum < 18 || ageNum > 99)
                return 'Please enter a valid age between 18 and 99.';
        }
        if (s === 2) {
            if (!formData.past_category) return 'Please select an online activity.';
            if (formData.past_category === 'Other' && !formData.past_category_other.trim())
                return 'Please specify "Other" for online activity.';
        }
        if (s === 3) {
            if (!formData.goal_category) return 'Please select a personal goal.';
            if (formData.goal_category === 'Other' && !formData.goal_category_other.trim())
                return 'Please specify "Other" for personal goal.';
        }
        if (s === 4) {
            if (!formData.attention_check) return 'Please answer the attention check question.';
        }
        return null;
    };

    const goNext = () => {
        const err = validateStep(step);
        if (err) { setError(err); return; }
        setError(null);

        // Intercept: if step 1 and country is "Other", show confirmation
        if (step === 1 && formData.country === 'Other') {
            setShowOtherConfirm(true);
            return;
        }

        setStep(prev => Math.min(prev + 1, 4));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const goBack = () => {
        setError(null);
        setStep(prev => Math.max(prev - 1, 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ─── Submit ──────────────────────────────────────────────────
    const handleSubmit = async () => {
        const err = validateStep(4);
        if (err) { setError(err); return; }
        setError(null);
        setIsSubmitting(true);

        const ageNum = parseInt(formData.age);
        const payload = {
            ...formData,
            age: ageNum,
            past_category: formData.past_category === 'Other' ? `Other: ${formData.past_category_other}` : formData.past_category,
            goal_category: formData.goal_category === 'Other' ? `Other: ${formData.goal_category_other}` : formData.goal_category,
            attention_check_pass: formData.attention_check === 'Weekly',
            submitted_at: new Date().toISOString(),
        };

        try {
            const response = await fetch('/api/t0/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prolific_pid: prolificPid,
                    study_id: studyId,
                    session_id: sessionId,
                    t0_payload: payload,
                }),
            });
            if (!response.ok) throw new Error('Failed to submit data');
            setSubmitted(true);
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Render: Country Confirmation ─────────────────────────────
    if (showOtherConfirm && !screenedOut) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <AlertCircle className="h-6 w-6 text-amber-500" />
                            Eligibility Check
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-lg text-muted-foreground">
                            This study is currently limited to participants in the <strong>US</strong> or <strong>UK</strong>.
                            You selected <strong>&quot;Other&quot;</strong>.
                        </p>
                        <p className="text-lg text-muted-foreground">
                            Did you select this by mistake?
                        </p>
                    </CardContent>
                    <CardFooter className="flex flex-col sm:flex-row gap-3">
                        <Button
                            variant="outline"
                            size="lg"
                            className="w-full text-base py-5"
                            onClick={() => {
                                setShowOtherConfirm(false);
                                // Keep form state, just return to step 1
                            }}
                        >
                            <ChevronLeft className="mr-2 h-5 w-5" />
                            Go back and change
                        </Button>
                        <Button
                            variant="destructive"
                            size="lg"
                            className="w-full text-base py-5"
                            onClick={() => {
                                setScreenedOut(true);
                            }}
                        >
                            Yes, I&apos;m in another country
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // ─── Render: Screen-out (final) ──────────────────────────────
    if (screenedOut) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center gap-2">
                            <AlertCircle className="h-6 w-6" />
                            Eligibility Check
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-lg">
                            Thank you for your interest. Unfortunately, this study is currently only open to participants located in the UK or US.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <p className="text-sm text-muted-foreground">Please return the submission on Prolific.</p>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // ─── Render: Submitted ───────────────────────────────────────
    if (submitted) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-lg border-green-200 bg-green-50/50">
                    <CardHeader>
                        <CardTitle className="text-green-700 flex items-center gap-2">
                            <CheckCircle2 className="h-6 w-6" />
                            Thank You!
                        </CardTitle>
                        <CardDescription className="text-green-600">
                            Your responses have been saved.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-green-800">
                        <p><strong>Part 1 Complete</strong></p>
                        <p>We'll invite you back for Part 2 in 7 days via Prolific messaging.</p>
                        <p>You may now close this tab.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ─── Render: Missing PID ─────────────────────────────────────
    if (!prolificPid) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Alert variant="destructive" className="max-w-lg">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        No Prolific PID found. Please access this study via the link provided on Prolific.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // ─── Render: Multi-Step Form ─────────────────────────────────
    return (
        <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">Study – Part 1</h1>
                    <p className="text-sm text-muted-foreground">ID: {prolificPid}</p>
                </div>

                {/* Progress */}
                <StepIndicator current={step} total={4} />

                {/* ─── STEP 1: About You ─────────────────────────── */}
                {step === 1 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">About You</CardTitle>
                            <CardDescription className="text-base">Tell us a bit about yourself.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-lg">Which country are you currently in? *</Label>
                                <Select
                                    value={formData.country}
                                    onValueChange={(value) => handleChange('country', value)}
                                >
                                    <SelectTrigger className="py-3 px-4 text-base">
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {countries.map(c => <SelectItem key={c} value={c} className="text-base">{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-lg">What city or town do you currently live in? *</Label>
                                <Input
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) => handleChange('city', e.target.value)}
                                    placeholder="e.g. London"
                                    className="py-3 px-4 text-base"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-lg">What is your age? *</Label>
                                <Input
                                    type="number"
                                    min="18" max="99"
                                    value={formData.age}
                                    onChange={(e) => handleChange('age', e.target.value)}
                                    placeholder="18–99"
                                    className="py-3 px-4 text-base"
                                />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ─── STEP 2: Recent Online Activity ────────────── */}
                {step === 2 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">Recent online activity</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <Label className="text-lg leading-snug">
                                    Which of the following best describes something you&apos;ve found yourself spending quite a bit of time on online recently (outside of work or study)? *
                                </Label>
                                <RadioGroup
                                    value={formData.past_category}
                                    onValueChange={(value) => handleChange('past_category', value)}
                                >
                                    {pastCategories.map(cat => (
                                        <div key={cat} className="flex items-center space-x-3 py-1">
                                            <RadioGroupItem value={cat} id={`past-${cat}`} />
                                            <Label htmlFor={`past-${cat}`} className="text-base font-normal cursor-pointer">{cat}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                                {formData.past_category === 'Other' && (
                                    <Input
                                        className="mt-2 py-3 px-4 text-base"
                                        type="text"
                                        placeholder="Please specify..."
                                        value={formData.past_category_other}
                                        onChange={(e) => handleChange('past_category_other', e.target.value)}
                                    />
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ─── STEP 3: Plans for the Coming Days ─────────── */}
                {step === 3 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">Plans for the coming month</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <Label className="text-lg leading-snug">
                                    Which of the following best describes one thing you would like to make meaningful progress on over the next month? *
                                </Label>
                                <RadioGroup
                                    value={formData.goal_category}
                                    onValueChange={(value) => handleChange('goal_category', value)}
                                >
                                    {goalCategories.map(cat => (
                                        <div key={cat} className="flex items-center space-x-3 py-1">
                                            <RadioGroupItem value={cat} id={`goal-${cat}`} />
                                            <Label htmlFor={`goal-${cat}`} className="text-base font-normal cursor-pointer">{cat}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                                {formData.goal_category === 'Other' && (
                                    <Input
                                        className="mt-2 py-3 px-4 text-base"
                                        type="text"
                                        placeholder="Please specify..."
                                        value={formData.goal_category_other}
                                        onChange={(e) => handleChange('goal_category_other', e.target.value)}
                                    />
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ─── STEP 4: Media Habits ──────────────────────── */}
                {step === 4 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">Media Habits</CardTitle>
                            <CardDescription className="text-base">A few more questions about your media habits.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-lg">How often do you listen to podcasts?</Label>
                                <Select
                                    value={formData.podcast_frequency}
                                    onValueChange={(value) => handleChange('podcast_frequency', value)}
                                >
                                    <SelectTrigger className="py-3 px-4 text-base">
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Never" className="text-base">Never</SelectItem>
                                        <SelectItem value="Monthly" className="text-base">Monthly</SelectItem>
                                        <SelectItem value="Weekly" className="text-base">Weekly</SelectItem>
                                        <SelectItem value="2-3x week" className="text-base">2-3x week</SelectItem>
                                        <SelectItem value="Daily" className="text-base">Daily</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-lg">How often do you multitask while listening to audio content?</Label>
                                <Select
                                    value={formData.multitask_audio_frequency}
                                    onValueChange={(value) => handleChange('multitask_audio_frequency', value)}
                                >
                                    <SelectTrigger className="py-3 px-4 text-base">
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Never" className="text-base">Never</SelectItem>
                                        <SelectItem value="Rarely" className="text-base">Rarely</SelectItem>
                                        <SelectItem value="Sometimes" className="text-base">Sometimes</SelectItem>
                                        <SelectItem value="Often" className="text-base">Often</SelectItem>
                                        <SelectItem value="Always" className="text-base">Always</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-lg">To show you&apos;re paying attention, please select &apos;Weekly&apos; here. *</Label>
                                <Select
                                    value={formData.attention_check}
                                    onValueChange={(value) => handleChange('attention_check', value)}
                                >
                                    <SelectTrigger className="py-3 px-4 text-base">
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Never" className="text-base">Never</SelectItem>
                                        <SelectItem value="Monthly" className="text-base">Monthly</SelectItem>
                                        <SelectItem value="Weekly" className="text-base">Weekly</SelectItem>
                                        <SelectItem value="Daily" className="text-base">Daily</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-lg">How many notifications do you estimate you get per day?</Label>
                                <Select
                                    value={formData.notifications_per_day}
                                    onValueChange={(value) => handleChange('notifications_per_day', value)}
                                >
                                    <SelectTrigger className="py-3 px-4 text-base">
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0-20" className="text-base">0–20</SelectItem>
                                        <SelectItem value="21-50" className="text-base">21–50</SelectItem>
                                        <SelectItem value="51-100" className="text-base">51–100</SelectItem>
                                        <SelectItem value="100+" className="text-base">100+</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ─── Error Alert ────────────────────────────────── */}
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription className="text-base">{error}</AlertDescription>
                    </Alert>
                )}

                {/* ─── Navigation Buttons ─────────────────────────── */}
                <div className="flex gap-4">
                    {step > 1 && (
                        <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            className="flex-1 text-lg py-6"
                            onClick={goBack}
                        >
                            <ChevronLeft className="mr-2 h-5 w-5" />
                            Back
                        </Button>
                    )}

                    {step < 4 && (
                        <Button
                            type="button"
                            size="lg"
                            className="flex-1 text-lg py-6"
                            onClick={goNext}
                        >
                            Next
                            <ChevronRight className="ml-2 h-5 w-5" />
                        </Button>
                    )}

                    {step === 4 && (
                        <Button
                            type="button"
                            size="lg"
                            className="flex-1 text-lg py-6"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit'}
                        </Button>
                    )}
                </div>
            </div>
        </main>
    );
}

export default function T0Page() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <T0Content />
        </Suspense>
    );
}
