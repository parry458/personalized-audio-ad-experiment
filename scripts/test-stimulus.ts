
import { getStimulusText } from '../src/lib/stimulus-generator';

const testCases = [
    {
        description: 'User Example: High A, London, 28, Gaming',
        input: {
            condition: 'high_a',
            city: 'London',
            age: 28,
            age_range: 'in your 20s', // Logic would derive this
            past_category: 'Gaming',
            goal_category: 'Work productivity / getting tasks done', // Dummy
            country: 'UK'
        },
        expectedPartial: 'Living in London at 28, it’s easy to get pulled into habits that quietly take over your time. Our records show that recently you’ve been spending a significant amount of time on gaming.'
    },
    {
        description: 'High B: Other personal goal',
        input: {
            condition: 'high_b',
            city: 'New York',
            age: 35,
            age_range: 'in your 30s',
            past_category: 'Social media scrolling',
            goal_category: 'Other', // Should map to "a personal goal"
            country: 'US'
        },
        expectedPartial: 'We know that you plan to focus on a personal goal'
    },
    {
        description: 'Medium: Age range check',
        input: {
            condition: 'medium',
            city: 'Manchester',
            age: 44,
            age_range: 'in your 40s',
            past_category: 'Gaming',
            goal_category: 'Other',
            country: 'UK'
        },
        expectedPartial: 'Living in Manchester often means balancing many responsibilities, especially in your 40s.'
    },
    {
        description: 'Low: Generic',
        input: {
            condition: 'low',
            city: 'Paris',
            age: 50,
            age_range: 'in your 50s',
            past_category: 'Gaming',
            goal_category: 'Other',
            country: 'France'
        },
        expectedPartial: 'Staying focused isn’t always easy'
    }
];

console.log('🧪 Testing Stimulus Generator...\n');

testCases.forEach((test, index) => {
    console.log(`Test ${index + 1}: ${test.description}`);
    // @ts-ignore
    const result = getStimulusText(test.input);
    console.log('Output:', result);

    if (result.includes(test.expectedPartial)) {
        console.log('✅ Passed\n');
    } else {
        console.error('❌ Failed');
        console.error('Expected to contain:', test.expectedPartial);
        console.log('\n');
    }
});
