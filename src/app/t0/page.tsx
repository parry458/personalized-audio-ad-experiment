/**
 * T0 Page - First Part of Prolific Study
 * =======================================
 * 
 * This page is the entry point for participants coming from Prolific.
 * Prolific automatically adds query parameters to the URL:
 *   - PROLIFIC_PID: Unique participant ID
 *   - STUDY_ID: The study identifier
 *   - SESSION_ID: The session identifier
 * 
 * This page:
 *   1. Reads and displays these IDs (for debugging)
 *   2. Shows a simple form to collect participant data
 *   3. Submits data to our API endpoint
 */

'use client'; // This makes it a Client Component (needed for useState, useEffect)

import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';

/**
 * Main T0 content component
 * Separated to allow Suspense boundary for useSearchParams
 */
function T0Content() {
    // ============================================
    // STEP 1: Read Prolific IDs from URL
    // ============================================
    // useSearchParams() gives us access to URL query parameters
    // Example URL: /t0?PROLIFIC_PID=abc123&STUDY_ID=study456&SESSION_ID=sess789
    const searchParams = useSearchParams();

    // Extract the three Prolific parameters
    const prolificPid = searchParams.get('PROLIFIC_PID') || 'NOT_PROVIDED';
    const studyId = searchParams.get('STUDY_ID') || 'NOT_PROVIDED';
    const sessionId = searchParams.get('SESSION_ID') || 'NOT_PROVIDED';

    // ============================================
    // STEP 2: Form State Management
    // ============================================
    // useState hooks to manage form data and submission status
    const [firstName, setFirstName] = useState(''); // The form field value
    const [isSubmitting, setIsSubmitting] = useState(false); // Loading state
    const [submitResult, setSubmitResult] = useState<string | null>(null); // Success/error message

    // ============================================
    // STEP 3: Form Submission Handler
    // ============================================
    const handleSubmit = async (e: React.FormEvent) => {
        // Prevent the default form submission (page reload)
        e.preventDefault();

        // Set loading state
        setIsSubmitting(true);
        setSubmitResult(null);

        try {
            // Send data to our API endpoint
            const response = await fetch('/api/t0/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    // Include Prolific IDs so we can link data to participants
                    prolific_pid: prolificPid,
                    study_id: studyId,
                    session_id: sessionId,
                    // Include the form data
                    t0_payload: {
                        first_name: firstName,
                        submitted_at: new Date().toISOString(),
                    },
                }),
            });

            // Parse the JSON response
            const data = await response.json();

            if (response.ok) {
                setSubmitResult('✅ Success! Data submitted.');
            } else {
                setSubmitResult(`❌ Error: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            // Handle network errors
            setSubmitResult(`❌ Network error: ${error}`);
        } finally {
            // Always reset loading state
            setIsSubmitting(false);
        }
    };

    // ============================================
    // STEP 4: Render the Page
    // ============================================
    return (
        <main style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
            <h1>T0 - Study Part 1</h1>

            {/* Debug section: Display Prolific IDs */}
            <section style={{
                background: '#f5f5f5',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '30px'
            }}>
                <h2 style={{ marginTop: 0 }}>🔍 Debug: Prolific IDs</h2>
                <p><strong>PROLIFIC_PID:</strong> <code>{prolificPid}</code></p>
                <p><strong>STUDY_ID:</strong> <code>{studyId}</code></p>
                <p><strong>SESSION_ID:</strong> <code>{sessionId}</code></p>
            </section>

            {/* Form section */}
            <section>
                <h2>📝 Participant Form</h2>
                <form onSubmit={handleSubmit}>
                    {/* First Name field */}
                    <div style={{ marginBottom: '20px' }}>
                        <label htmlFor="firstName" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                            First Name (dummy field for testing):
                        </label>
                        <input
                            type="text"
                            id="firstName"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Enter your first name"
                            required
                            style={{
                                width: '100%',
                                padding: '12px',
                                fontSize: '16px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    {/* Submit button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            background: isSubmitting ? '#ccc' : '#0070f3',
                            color: 'white',
                            padding: '12px 24px',
                            fontSize: '16px',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit T0'}
                    </button>
                </form>

                {/* Display submission result */}
                {submitResult && (
                    <p style={{
                        marginTop: '20px',
                        padding: '12px',
                        background: submitResult.includes('Success') ? '#d4edda' : '#f8d7da',
                        borderRadius: '4px'
                    }}>
                        {submitResult}
                    </p>
                )}
            </section>
        </main>
    );
}

/**
 * T0 Page Component
 * Wrapped in Suspense because useSearchParams requires it in Next.js 14+
 */
export default function T0Page() {
    return (
        <Suspense fallback={<div style={{ padding: '40px' }}>Loading...</div>}>
            <T0Content />
        </Suspense>
    );
}
