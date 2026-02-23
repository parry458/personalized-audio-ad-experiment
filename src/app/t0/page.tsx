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
import { useState, useEffect, useRef, Suspense } from 'react';
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

    // Step state (0 = consent, 1 = screener, 2-4 = form steps)
    const [step, setStep] = useState(0);
    const [consentAnswer, setConsentAnswer] = useState<string>('');
    const startTimeRef = useRef(Date.now());

    // Screener state
    const [screenerAnswers, setScreenerAnswers] = useState<Record<string, string>>({});
    const [screenFailed, setScreenFailed] = useState(false);

    // Form State (persisted across steps)
    const [formData, setFormData] = useState({
        country: '',
        city: '',
        age: '',
        gender: '',
        past_category: '',
        past_category_other: '',
        goal_category: '',
        goal_category_other: '',
    });

    const [showOtherConfirm, setShowOtherConfirm] = useState(false);
    const [screenedOut, setScreenedOut] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [alreadyCompleted, setAlreadyCompleted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [checking, setChecking] = useState(true);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Check on mount if T0 was already completed for this PID
    useEffect(() => {
        if (!prolificPid) {
            setChecking(false);
            return;
        }

        const checkExisting = async () => {
            try {
                // Check screener failure first
                const screenRes = await fetch(`/api/t0/screener?prolific_pid=${encodeURIComponent(prolificPid)}`);
                const screenData = await screenRes.json();
                if (screenData.screen_failed) {
                    setScreenFailed(true);
                    setChecking(false);
                    return;
                }

                const res = await fetch(`/api/t0/check?prolific_pid=${encodeURIComponent(prolificPid)}`);
                const data = await res.json();
                if (data.already_completed_t0) {
                    setAlreadyCompleted(true);
                }
            } catch {
                // If check fails, allow form (submit guard still protects)
            }
            setChecking(false);
        };

        checkExisting();
    }, [prolificPid]);

    // Options
    const countries = ['UK', 'USA', 'Other'];

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
        // Clear inline error for this field when user corrects it
        setFieldErrors(prev => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const handleScreenerChange = (field: string, value: string) => {
        setScreenerAnswers(prev => ({ ...prev, [field]: value }));
        setFieldErrors(prev => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    // ─── Step Validation ─────────────────────────────────────────
    const validateStep = (s: number): Record<string, string> => {
        const errors: Record<string, string> = {};
        const msg = 'Please answer this question before continuing.';
        if (s === 1) {
            if (!screenerAnswers.q1) errors.q1 = msg;
            if (!screenerAnswers.q2) errors.q2 = msg;
            if (!screenerAnswers.q3) errors.q3 = msg;
        }
        if (s === 2) {
            if (!formData.country) errors.country = msg;
            if (!formData.city.trim()) errors.city = msg;
            const ageNum = parseInt(formData.age);
            if (!formData.age || isNaN(ageNum) || ageNum < 18 || ageNum > 99)
                errors.age = 'Please enter a valid age between 18 and 99.';
            if (!formData.gender) errors.gender = msg;
        }
        if (s === 3) {
            if (!formData.past_category) errors.past_category = msg;
            if (formData.past_category === 'Other' && !formData.past_category_other.trim())
                errors.past_category_other = 'Please specify your answer.';
        }
        if (s === 4) {
            if (!formData.goal_category) errors.goal_category = msg;
            if (formData.goal_category === 'Other' && !formData.goal_category_other.trim())
                errors.goal_category_other = 'Please specify your answer.';
        }
        return errors;
    };

    const scrollToFirstError = () => {
        setTimeout(() => {
            const el = document.querySelector('[data-field-error="true"]');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
    };

    // Screener answer checking + failure recording
    const handleScreenerNext = async () => {
        const errors = validateStep(1);
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            scrollToFirstError();
            return;
        }
        setFieldErrors({});

        // Check correctness
        const correct =
            screenerAnswers.q1 === 'A book' &&
            screenerAnswers.q2 === 'Yawning' &&
            screenerAnswers.q3 === 'Piano';

        if (!correct) {
            // Record failure permanently
            try {
                await fetch('/api/t0/screener', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prolific_pid: prolificPid }),
                });
            } catch { /* best effort */ }
            setScreenFailed(true);
            return;
        }

        setStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const goNext = () => {
        const errors = validateStep(step);
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            scrollToFirstError();
            return;
        }
        setFieldErrors({});

        // Intercept: if step 2 and country is "Other", show confirmation
        if (step === 2 && formData.country === 'Other') {
            setShowOtherConfirm(true);
            return;
        }

        setStep(prev => Math.min(prev + 1, 4));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const goBack = () => {
        setFieldErrors({});
        setStep(prev => Math.max(prev - 1, 0));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ─── Submit ──────────────────────────────────────────────────
    const handleSubmit = async () => {
        const errors = validateStep(4);
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            scrollToFirstError();
            return;
        }
        setFieldErrors({});
        setIsSubmitting(true);

        const ageNum = parseInt(formData.age);
        const payload = {
            ...formData,
            age: ageNum,
            past_category: formData.past_category === 'Other' ? `Other: ${formData.past_category_other}` : formData.past_category,
            goal_category: formData.goal_category === 'Other' ? `Other: ${formData.goal_category_other}` : formData.goal_category,
            submitted_at: new Date().toISOString(),
            duration_seconds: Math.round((Date.now() - startTimeRef.current) / 1000),
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
            const data = await response.json();

            // Check for duplicate submission
            if (data.already_completed_t0) {
                setAlreadyCompleted(true);
                return;
            }

            if (!response.ok && !data.ok) throw new Error(data.error || 'Failed to submit data');
            setSubmitted(true);
        } catch (err: any) {
            setFieldErrors({ _submit: err.message || 'Something went wrong' });
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

    // ─── Render: Screener Failed (permanent) ────────────────────
    if (screenFailed) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center gap-2">
                            <AlertCircle className="h-6 w-6" />
                            Study Closed
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-lg">
                            Unfortunately, you do not meet the criteria for this study.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <p className="text-sm text-muted-foreground">Please return the submission on Prolific.</p>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // ─── Render: Already Completed T0 ────────────────────────────
    if (alreadyCompleted) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-lg border-blue-200 bg-blue-50/50">
                    <CardHeader>
                        <CardTitle className="text-blue-700 flex items-center gap-2">
                            <CheckCircle2 className="h-6 w-6" />
                            Already Completed
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-blue-800">
                        <p>You have already completed Part 1 of this study.</p>
                        <p>We&apos;ll invite you back for Part 2 via Prolific messaging.</p>
                        <p>You may now close this tab. Thank you!</p>
                    </CardContent>
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

    // ─── Render: Checking for existing submission ─────────────────
    if (checking) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <p className="text-lg text-muted-foreground">Loading...</p>
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
            <div className={`${step === 0 ? 'max-w-4xl' : 'max-w-3xl'} mx-auto space-y-8`}>
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">Study – Part 1</h1>
                    <p className="text-sm text-muted-foreground">ID: {prolificPid}</p>
                </div>

                {/* Progress – only for Steps 1-4 */}
                {step > 0 && <StepIndicator current={step} total={4} />}

                {/* ─── STEP 0: Informed Consent ────────────────────── */}
                {step === 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">Informed Consent</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-base leading-relaxed">
                            <p>Please read this consent agreement carefully before deciding whether to participate in this study.</p>

                            <p><strong>Purpose of the research study:</strong><br />
                                The purpose of this study is to investigate how people perceive and evaluate audio content in a digital environment.</p>

                            <p><strong>What you will do in the study:</strong><br />
                                This study consists of two parts. In Part 1, you will answer survey questions. In Part 2, you will listen to an audio recording and answer follow-up questions. Part 2 will take place 7 days after submitting Part 1.</p>

                            <p><strong>Time required:</strong><br />
                                Part 1 will take approximately 1–2 minutes. Part 2 will take approximately 3 minutes.</p>

                            <p><strong>Risks:</strong><br />
                                There are no anticipated risks associated with participating in this study.</p>

                            <p><strong>Benefits:</strong><br />
                                There are no direct benefits to you for participating in this research study. The findings may help researchers better understand how people behave. We hope that, in the future, other people might benefit from this study.</p>

                            <p><strong>Confidentiality:</strong><br />
                                Your data will be anonymous, meaning your name will not be collected or linked to it. The data collected by investigators will not be linked to your identity. Researchers will not ascertain identities based on demographic information. If we write a report or article about this research project, your identity will be protected to the maximum extent possible. In addition, we will not maintain any identifiable information about you after you get paid. All data will be deleted upon completion of the study.</p>

                            <p><strong>Voluntary participation:</strong><br />
                                Your participation in this study is completely voluntary.</p>

                            <p><strong>Right to withdraw from the study:</strong><br />
                                You have the right to withdraw from the study at any time without penalty. If you decide not to participate or to stop participating, you will not lose any benefits to which you are otherwise entitled.</p>

                            <p><strong>How to withdraw from the study:</strong><br />
                                If you wish to withdraw before completing the study, you may simply close the survey window. Your responses will not be recorded if you withdraw before submitting them. Because the study is anonymous, it is not possible to remove your data after submission. You will still receive full payment in accordance with Prolific&apos;s policies.</p>

                            <p><strong>Payment:</strong><br />
                                You will receive payment as specified on Prolific for completing the full study. You will only receive the payment if you complete both parts of the study.</p>

                            <p><strong>Contact information:</strong><br />
                                If you have questions about this study, please contact:<br />
                                [Your Name]<br />
                                [Your University]<br />
                                [Your Email Address]</p>

                            <hr className="my-4" />

                            <div className="space-y-3">
                                <Label className="text-lg leading-snug">
                                    Do you agree to participate in the research study described above? *
                                </Label>
                                <RadioGroup
                                    value={consentAnswer}
                                    onValueChange={(value) => setConsentAnswer(value)}
                                >
                                    <div className="flex items-center space-x-3 py-1">
                                        <RadioGroupItem value="Yes" id="consent-yes" />
                                        <Label htmlFor="consent-yes" className="text-base font-normal cursor-pointer">Yes</Label>
                                    </div>
                                    <div className="flex items-center space-x-3 py-1">
                                        <RadioGroupItem value="No" id="consent-no" />
                                        <Label htmlFor="consent-no" className="text-base font-normal cursor-pointer">No</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ─── STEP 1: Screener ─────────────────────────────── */}
                {step === 1 && (
                    <Card>
                        <CardContent className="space-y-8 pt-6">
                            {/* Q1: Reading comprehension */}
                            <div className="space-y-3" data-field-error={!!fieldErrors.q1 || undefined}>
                                <p className="text-base leading-relaxed">
                                    Matt and Alex are best friends.<br />
                                    Alex&apos;s birthday is coming up soon.<br />
                                    Matt wanted to buy Alex a computer or a television, but they were too expensive.<br />
                                    Instead, he bought him a book.
                                </p>
                                <Label className="text-lg mt-4 block">What did Matt buy? *</Label>
                                <RadioGroup
                                    value={screenerAnswers.q1 || ''}
                                    onValueChange={(value) => handleScreenerChange('q1', value)}
                                >
                                    {['A computer', 'A television', 'A book', 'His birthday'].map(opt => (
                                        <div key={opt} className="flex items-center space-x-3 py-1">
                                            <RadioGroupItem value={opt} id={`sq1-${opt}`} />
                                            <Label htmlFor={`sq1-${opt}`} className="text-base font-normal cursor-pointer">{opt}</Label>
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
                                            <RadioGroupItem value={opt} id={`sq2-${opt}`} />
                                            <Label htmlFor={`sq2-${opt}`} className="text-base font-normal cursor-pointer">{opt}</Label>
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
                                            <RadioGroupItem value={opt} id={`sq3-${opt}`} />
                                            <Label htmlFor={`sq3-${opt}`} className="text-base font-normal cursor-pointer">{opt}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                                {fieldErrors.q3 && <p className="text-sm text-red-500">{fieldErrors.q3}</p>}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ─── STEP 2: About You ─────────────────────────── */}
                {step === 2 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">Please answer the following questions.</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2" data-field-error={!!fieldErrors.country || undefined}>
                                <Label className="text-lg">Which country are you currently in? *</Label>
                                <Select
                                    value={formData.country}
                                    onValueChange={(value) => handleChange('country', value)}
                                >
                                    <SelectTrigger className={`py-3 px-4 text-base ${fieldErrors.country ? 'border-red-500 ring-red-500' : ''}`}>
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {countries.map(c => <SelectItem key={c} value={c} className="text-base">{c === 'USA' ? 'USA' : c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {fieldErrors.country && <p className="text-sm text-red-500">{fieldErrors.country}</p>}
                            </div>

                            <div className="space-y-2" data-field-error={!!fieldErrors.city || undefined}>
                                <Label className="text-lg">What city or town do you currently live in? *</Label>
                                <Input
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) => handleChange('city', e.target.value)}
                                    placeholder="e.g. London"
                                    className={`py-3 px-4 text-base ${fieldErrors.city ? 'border-red-500 ring-red-500' : ''}`}
                                />
                                {fieldErrors.city && <p className="text-sm text-red-500">{fieldErrors.city}</p>}
                            </div>

                            <div className="space-y-2" data-field-error={!!fieldErrors.age || undefined}>
                                <Label className="text-lg">What is your age? *</Label>
                                <Input
                                    type="number"
                                    min="18" max="99"
                                    value={formData.age}
                                    onChange={(e) => handleChange('age', e.target.value)}
                                    placeholder="18–99"
                                    className={`py-3 px-4 text-base ${fieldErrors.age ? 'border-red-500 ring-red-500' : ''}`}
                                />
                                {fieldErrors.age && <p className="text-sm text-red-500">{fieldErrors.age}</p>}
                            </div>

                            <div className="space-y-2" data-field-error={!!fieldErrors.gender || undefined}>
                                <Label className="text-lg">What is your gender? *</Label>
                                <Select
                                    value={formData.gender}
                                    onValueChange={(value) => handleChange('gender', value)}
                                >
                                    <SelectTrigger className={`py-3 px-4 text-base ${fieldErrors.gender ? 'border-red-500 ring-red-500' : ''}`}>
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Male" className="text-base">Male</SelectItem>
                                        <SelectItem value="Female" className="text-base">Female</SelectItem>
                                        <SelectItem value="Other" className="text-base">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                {fieldErrors.gender && <p className="text-sm text-red-500">{fieldErrors.gender}</p>}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ─── STEP 3: Recent Online Activity ────────────── */}
                {step === 3 && (
                    <Card>
                        <CardContent className="space-y-4 pt-6">
                            <div className="space-y-3" data-field-error={!!fieldErrors.past_category || undefined}>
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
                                {fieldErrors.past_category && <p className="text-sm text-red-500">{fieldErrors.past_category}</p>}
                                {formData.past_category === 'Other' && (
                                    <>
                                        <Input
                                            className={`mt-2 py-3 px-4 text-base ${fieldErrors.past_category_other ? 'border-red-500 ring-red-500' : ''}`}
                                            type="text"
                                            placeholder="Please specify..."
                                            value={formData.past_category_other}
                                            onChange={(e) => handleChange('past_category_other', e.target.value)}
                                        />
                                        {fieldErrors.past_category_other && <p className="text-sm text-red-500">{fieldErrors.past_category_other}</p>}
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ─── STEP 4: Plans for the Coming Days ─────────── */}
                {step === 4 && (
                    <Card>
                        <CardContent className="space-y-4 pt-6">
                            <div className="space-y-3" data-field-error={!!fieldErrors.goal_category || undefined}>
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
                                {fieldErrors.goal_category && <p className="text-sm text-red-500">{fieldErrors.goal_category}</p>}
                                {formData.goal_category === 'Other' && (
                                    <>
                                        <Input
                                            className={`mt-2 py-3 px-4 text-base ${fieldErrors.goal_category_other ? 'border-red-500 ring-red-500' : ''}`}
                                            type="text"
                                            placeholder="Please specify..."
                                            value={formData.goal_category_other}
                                            onChange={(e) => handleChange('goal_category_other', e.target.value)}
                                        />
                                        {fieldErrors.goal_category_other && <p className="text-sm text-red-500">{fieldErrors.goal_category_other}</p>}
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}


                {/* ─── Submit Error ───────────────────────────────── */}
                {fieldErrors._submit && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription className="text-base">{fieldErrors._submit}</AlertDescription>
                    </Alert>
                )}

                {/* ─── Navigation Buttons ─────────────────────────── */}
                <div className="flex gap-4">
                    {step > 0 && (
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

                    {step === 0 && (
                        <Button
                            type="button"
                            size="lg"
                            className="flex-1 text-lg py-6"
                            onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            disabled={consentAnswer !== 'Yes'}
                        >
                            Continue
                            <ChevronRight className="ml-2 h-5 w-5" />
                        </Button>
                    )}

                    {step === 1 && (
                        <Button
                            type="button"
                            size="lg"
                            className="flex-1 text-lg py-6"
                            onClick={handleScreenerNext}
                        >
                            Next
                            <ChevronRight className="ml-2 h-5 w-5" />
                        </Button>
                    )}

                    {step >= 2 && step < 4 && (
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
