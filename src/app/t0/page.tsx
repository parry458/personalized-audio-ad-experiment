/**
 * T0 Page - First Part of Prolific Study
 * =======================================
 * Includes:
 * - Demographics (Country, City, Age)
 * - Interest categories (Past, Goal)
 * - Distractor questions
 * - Attention Check
 * - Screen-out logic for 'Other' country
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
import { AlertCircle, CheckCircle2 } from "lucide-react";

function T0Content() {
    // URL Params
    const searchParams = useSearchParams();
    const prolificPid = searchParams.get('PROLIFIC_PID') || '';
    const studyId = searchParams.get('STUDY_ID') || '';
    const sessionId = searchParams.get('SESSION_ID') || '';

    // Form State
    const [formData, setFormData] = useState({
        country: '',
        city: '',
        age: '',
        past_category: '', // 1-8 option key
        past_category_other: '',
        goal_category: '', // 1-8 option key
        goal_category_other: '',
        podcast_frequency: '',
        podcast_genres: [] as string[],
        shortform_frequency: '',
        favorite_movie_genre: '',
        streaming_services: [] as string[],
        devices: [] as string[],
        notifications_per_day: '',
        busy_challenge: '',
        attention_check: '', // User selected value
    });

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
        'News / politics / current events',
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

    // Handlers
    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Immediate screen-out check
        if (field === 'country' && value === 'Other') {
            setScreenedOut(true);
        }
    };

    const handleCheckboxChange = (field: string, value: string) => {
        setFormData(prev => {
            const currentArray = prev[field as keyof typeof prev] as string[];
            if (currentArray.includes(value)) {
                return { ...prev, [field]: currentArray.filter(item => item !== value) };
            } else {
                return { ...prev, [field]: [...currentArray, value] };
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation - Age
        const ageNum = parseInt(formData.age);
        if (isNaN(ageNum) || ageNum < 18 || ageNum > 99) {
            setError('Please enter a valid age between 18 and 99.');
            return;
        }

        // Required check (basic) happens via 'required' attribute logic, but complex logic here:
        if (formData.past_category === 'Other' && !formData.past_category_other) {
            setError('Please specify "Other" for online activity.');
            return;
        }
        if (formData.goal_category === 'Other' && !formData.goal_category_other) {
            setError('Please specify "Other" for personal goal.');
            return;
        }

        setIsSubmitting(true);

        // Prepare payload
        const payload = {
            ...formData,
            age: ageNum,
            past_category: formData.past_category === 'Other' ? `Other: ${formData.past_category_other}` : formData.past_category,
            goal_category: formData.goal_category === 'Other' ? `Other: ${formData.goal_category_other}` : formData.goal_category,
            // Check attention check
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

            if (!response.ok) {
                throw new Error('Failed to submit data');
            }

            setSubmitted(true);
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render Logic
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
                        <p className="text-muted-foreground">
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
                        <p>We’ll invite you back for Part 2 in 7 days via Prolific messaging.</p>
                        <p>You may now close this tab.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

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

    return (
        <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Study - Part 1</h1>
                    <p className="text-sm text-muted-foreground">ID: {prolificPid}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* SECTION 1: DEMOGRAPHICS */}
                    <Card>
                        <CardHeader>
                            <CardTitle>1. About You</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Which country are you currently in? *</Label>
                                <Select
                                    value={formData.country}
                                    onValueChange={(value) => handleChange('country', value)}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>What city or town do you currently live in? *</Label>
                                <Input
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) => handleChange('city', e.target.value)}
                                    required
                                    placeholder="e.g. London"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>What is your age? *</Label>
                                <Input
                                    type="number"
                                    min="18" max="99"
                                    value={formData.age}
                                    onChange={(e) => handleChange('age', e.target.value)}
                                    required
                                    placeholder="18-99"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* SECTION 2: INTERESTS */}
                    <Card>
                        <CardHeader>
                            <CardTitle>2. Weekly Activities</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="space-y-3">
                                <Label className="leading-snug">
                                    Which of the following best describes something you spent a lot of time on online in the last 7 days (outside of work/study)? *
                                </Label>
                                <RadioGroup
                                    value={formData.past_category}
                                    onValueChange={(value) => handleChange('past_category', value)}
                                    required
                                >
                                    {pastCategories.map(cat => (
                                        <div key={cat} className="flex items-center space-x-2">
                                            <RadioGroupItem value={cat} id={`past-${cat}`} />
                                            <Label htmlFor={`past-${cat}`} className="font-normal cursor-pointer">{cat}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                                {formData.past_category === 'Other' && (
                                    <Input
                                        className="mt-2"
                                        type="text"
                                        placeholder="Please specify..."
                                        value={formData.past_category_other}
                                        onChange={(e) => handleChange('past_category_other', e.target.value)}
                                        required
                                    />
                                )}
                            </div>

                            <div className="space-y-3">
                                <Label className="leading-snug">
                                    Which of the following best describes one thing you want to make real progress on in the next 7 days? *
                                </Label>
                                <RadioGroup
                                    value={formData.goal_category}
                                    onValueChange={(value) => handleChange('goal_category', value)}
                                    required
                                >
                                    {goalCategories.map(cat => (
                                        <div key={cat} className="flex items-center space-x-2">
                                            <RadioGroupItem value={cat} id={`goal-${cat}`} />
                                            <Label htmlFor={`goal-${cat}`} className="font-normal cursor-pointer">{cat}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                                {formData.goal_category === 'Other' && (
                                    <Input
                                        className="mt-2"
                                        type="text"
                                        placeholder="Please specify..."
                                        value={formData.goal_category_other}
                                        onChange={(e) => handleChange('goal_category_other', e.target.value)}
                                        required
                                    />
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* SECTION 3: MEDIA HABITS (DISTRACTORS) */}
                    <Card>
                        <CardHeader>
                            <CardTitle>3. Media Habits</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>How often do you listen to podcasts?</Label>
                                <Select
                                    value={formData.podcast_frequency}
                                    onValueChange={(value) => handleChange('podcast_frequency', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Never">Never</SelectItem>
                                        <SelectItem value="Monthly">Monthly</SelectItem>
                                        <SelectItem value="Weekly">Weekly</SelectItem>
                                        <SelectItem value="2-3x week">2-3x week</SelectItem>
                                        <SelectItem value="Daily">Daily</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>To show you’re paying attention, please select ‘Weekly’ here. *</Label>
                                <Select
                                    value={formData.attention_check}
                                    onValueChange={(value) => handleChange('attention_check', value)}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Never">Never</SelectItem>
                                        <SelectItem value="Monthly">Monthly</SelectItem>
                                        <SelectItem value="Weekly">Weekly</SelectItem>
                                        <SelectItem value="Daily">Daily</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>How many notifications do you estimate you get per day?</Label>
                                <Select
                                    value={formData.notifications_per_day}
                                    onValueChange={(value) => handleChange('notifications_per_day', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0-20">0-20</SelectItem>
                                        <SelectItem value="21-50">21-50</SelectItem>
                                        <SelectItem value="51-100">51-100</SelectItem>
                                        <SelectItem value="100+">100+</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>What is your biggest daily challenge?</Label>
                                <Select
                                    value={formData.busy_challenge}
                                    onValueChange={(value) => handleChange('busy_challenge', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Staying focused">Staying focused</SelectItem>
                                        <SelectItem value="Prioritizing">Prioritizing</SelectItem>
                                        <SelectItem value="Remembering tasks">Remembering tasks</SelectItem>
                                        <SelectItem value="Getting started">Getting started</SelectItem>
                                        <SelectItem value="Time management">Time management</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <Button
                        type="submit"
                        size="lg"
                        className="w-full text-lg"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit'}
                    </Button>
                </form>
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
