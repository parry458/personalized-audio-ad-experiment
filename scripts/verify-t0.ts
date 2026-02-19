
// Native fetch is available in Node 18+

async function verifyT0() {
    console.log('🧪 Verifying T0 Submission...');

    const payload = {
        prolific_pid: `test_user_age44_${Date.now()}`,
        study_id: 'test_study',
        session_id: 'test_session',
        t0_payload: {
            country: 'UK',
            city: 'London',
            age: 44,
            past_category: 'Gaming',
            goal_category: 'Health',
            attention_check_pass: true,
            submitted_at: new Date().toISOString()
        }
    };

    try {
        const response = await fetch('http://localhost:3000/api/t0/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ T0 Submission Successful!');
            console.log('   Assigned Condition:', data.assigned_condition);
            console.log('   Participant ID:', payload.prolific_pid);
        } else {
            console.error('❌ T0 Submission Failed:', data);
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Network Error:', error);
        process.exit(1);
    }
}

// Wait for server to be ready (naive wait)
setTimeout(verifyT0, 5000);
