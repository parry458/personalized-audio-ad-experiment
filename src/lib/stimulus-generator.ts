/**
 * Stimulus Text Generator
 * =======================
 * Generates the final TTS script dynamically based on participant data and condition.
 */

import { computeAgeRange } from '@/lib/age-range';

// Define mappings as requested
const PAST_CATEGORY_MAPPING: Record<string, string> = {
    // --- NEW FINALIZED OPTIONS ---
    'Scrolling through social media': 'scrolling through social media',
    'Watching videos, TV, or streaming content online': 'watching videos or streaming shows online',
    'Browsing products or shopping online': 'browsing products or shopping online',
    'Playing video games': 'playing video games',
    'Watching live sports or sports highlights': 'watching live sports or sports highlights',
    'Using dating apps': 'using dating apps',
    'Chatting online with friends or family': 'chatting online with friends or family',
    'Reading news or informational content': 'reading news or informational content online',
    'Listening to music or other audio content': 'listening to music or audio content online',

    'Social media scrolling': 'social media',
    'Streaming videos/TV': 'streaming',
    'Online shopping / browsing products': 'online shopping',
    'Gaming': 'gaming',
    'Watching sports highlights or sports videos': 'watching sports highlights or sports videos',
    'Sports content': 'sports content',
    'Dating apps / messaging': 'dating apps',
    'Other': 'online activity'
};

const GOAL_CATEGORY_MAPPING: Record<string, string> = {
    // --- NEW FINALIZED OPTIONS ---
    'Getting better organized or planning my tasks': 'getting better organized',
    'Studying or learning something new': 'studying or learning something new',
    'Getting important work tasks done': 'getting important work tasks done',
    'Building a healthier routine (sleep, exercise, habits)': 'building a healthier daily routine',
    'Working on a personal project': 'working on a personal project',
    'Searching for new job opportunities or career options': 'searching for new job opportunities',
    'Taking care of personal or administrative tasks': 'taking care of personal tasks and responsibilities',
    'Improving my relationships or social life': 'improving your relationships or social life',
    'Improving my financial situation': 'improving your financial situation',

    // --- LEGACY FALLBACKS (DO NOT REMOVE) ---
    'Getting organized / planning my week': 'getting organized',
    'Studying / learning / exams': 'studying',
    'Work productivity / getting tasks done': 'work tasks',
    'Health routine (sleep, exercise, habits)': 'building a routine',
    'Personal project / creative work': 'a personal project',
    'Job search / applications / career planning': 'job search',
    'Home/admin tasks (finances, paperwork, chores)': 'life admin',
    'Other': 'a personal goal'
};

// Block 2 & 3 (Identical for all)
// Block 2 & 3 (Identical for all)
const BLOCK_2 = "FocusFlow is an AI-powered productivity app that helps you structure your day and prioritize what matters most — turning your goals into clear daily steps and keeping you on track with smart reminders.";
const BLOCK_3 = "That’s FocusFlow — download it today and take control of your time.";

// Block 1 Templates
const BLOCK_1_TEMPLATES = {
    high_b: "Living in {{CITY}} at age {{AGE}} often means working toward something meaningful. We know that you plan to focus on {{GOAL_CATEGORY}}, and that’s why we want to show you a solution designed specifically to support that goal.",
    high_a: "Living in {{CITY}} at age {{AGE}}, it’s easy to get pulled into habits that quietly take over your time. Our records show that recently you’ve been spending a significant amount of time on {{PAST_CATEGORY}}. This tells us where your attention is currently going.",
    low: "Staying focused isn’t always easy, especially when daily responsibilities compete for attention. Distractions build up quickly, and even meaningful goals can lose momentum without a clear structure in place.",
    medium: "Living in {{CITY}} often means balancing many responsibilities, especially {{AGE_RANGE}}. Staying organized and consistent can make the difference between feeling busy and making real progress."
};

interface ParticipantData {
    country: string;
    city: string;
    age: number;
    age_range: string;
    condition: 'low' | 'medium' | 'high_a' | 'high_b';
    past_category: string;
    goal_category: string;
}

export function getStimulusText(participant: ParticipantData): string {
    const { condition, city, age, age_range, past_category, goal_category } = participant;

    let block1 = BLOCK_1_TEMPLATES[condition];

    if (!block1) {
        // Fallback or error - though condition should be valid
        console.warn(`Unknown condition: ${condition}, defaulting to LOW text structure (safe fallback).`);
        block1 = BLOCK_1_TEMPLATES.low;
    }

    // Apply mappings safely (fallback to original text if not found, or specific 'Other' logic if needed)
    // The requirement says "Apply safe mappings before replacing categories".
    // If exact match not found, what to do? User provided specific list.
    // We will try to match exact string, if not found, we might want to check if it STARTS with keys or just use raw value?
    // Given the strict list, exact match is expected. For 'Other', the frontend sends "Other: ..." text sometimes.
    // Logic: If key exists in mapping, use it. If not, if it starts with "Other", use the "Other" mapping.
    // Actually, earlier code stored "Other: user_text".
    // The mapping has "Other" -> "online activity" / "a personal goal".
    // So if the stored value is "Other: ...", we should map it to the requested generic phrase?
    // Or did the prompt imply we use the user's text?
    // "Other -> 'online activity'" implies we use the GENERIC phrase, not the user's specific text.
    // So if the value STARTS with "Other", we map to the "Other" value.

    let mappedPast = PAST_CATEGORY_MAPPING[past_category];
    if (!mappedPast && past_category.startsWith('Other')) {
        mappedPast = PAST_CATEGORY_MAPPING['Other'];
    }
    // Final fallback: use lowercased value if really nothing matches
    if (!mappedPast) mappedPast = past_category.toLowerCase();


    let mappedGoal = GOAL_CATEGORY_MAPPING[goal_category];
    if (!mappedGoal && goal_category.startsWith('Other')) {
        mappedGoal = GOAL_CATEGORY_MAPPING['Other'];
    }
    if (!mappedGoal) mappedGoal = goal_category.toLowerCase();


    // Replace placeholders
    // Rules: Trim extra whitespace.
    const cityClean = city.trim();
    const ageClean = age.toString();
    const ageRangeClean = age_range ? age_range.trim() : computeAgeRange(age);

    block1 = block1.replace('{{CITY}}', cityClean);
    block1 = block1.replace('{{AGE}}', ageClean);
    block1 = block1.replace('{{AGE_RANGE}}', ageRangeClean);
    block1 = block1.replace('{{PAST_CATEGORY}}', mappedPast);
    block1 = block1.replace('{{GOAL_CATEGORY}}', mappedGoal);

    // Concatenate
    return `${block1} ${BLOCK_2} ${BLOCK_3}`;
}
