/**
 * T1 Questionnaire Items Configuration
 * =====================================
 * 
 * Contains all scales and items for the T1 survey.
 * Import this in the T1 page to render the questionnaire.
 */

// Type definitions
export interface LikertItem {
    item_id: string;
    text: string;
    reverse: boolean;
    active: boolean;
}

export interface SemanticDifferentialItem {
    item_id: string;
    prompt?: string;
    left: string;
    right: string;
    active: boolean;
}

export interface LikertScale {
    scale_id: string;
    scale_label: string;
    type: 'likert';
    items: LikertItem[];
}

export interface SemanticDifferentialScale {
    scale_id: string;
    scale_label: string;
    type: 'semantic_differential';
    items: SemanticDifferentialItem[];
}

export type Scale = LikertScale | SemanticDifferentialScale;

export interface T1Config {
    likert: {
        min: number;
        max: number;
        labels: { [key: string]: string };
    };
    scales: Scale[];
}

// Main configuration
export const T1_ITEMS: T1Config = {
    likert: {
        min: 1,
        max: 7,
        labels: {
            "1": "Strongly disagree",
            "7": "Strongly agree",
        },
    },
    scales: [
        // ============================================
        // SCALE 1: Perceived Ad Relevance
        // ============================================
        {
            scale_id: "relevance",
            scale_label: "Perceived Ad Relevance",
            type: "likert",
            items: [
                { item_id: "rel_important", text: "When I listened to the advertisement, I felt it is important to me.", reverse: false, active: true },
                { item_id: "rel_value", text: "When I listened to the advertisement, I felt it is of value to me.", reverse: false, active: true },
                { item_id: "rel_needs", text: "When I listened to the advertisement, I felt it is relevant to my needs.", reverse: false, active: true },
                { item_id: "rel_useful", text: "When I listened to the advertisement, I felt it is useful to me.", reverse: false, active: true },
                { item_id: "rel_interesting", text: "When I listened to the advertisement, I felt it is interesting to me.", reverse: false, active: true },
            ],
        },
        // ============================================
        // SCALE 2: Perceived Ad Intrusiveness
        // ============================================
        {
            scale_id: "intrusiveness",
            scale_label: "Perceived Ad Intrusiveness",
            type: "likert",
            items: [
                { item_id: "intr_distracting", text: "The advertisement was distracting.", reverse: false, active: true },
                { item_id: "intr_forced", text: "The advertisement was forced.", reverse: false, active: true },
                { item_id: "intr_interfering", text: "The advertisement was interfering.", reverse: false, active: true },
                { item_id: "intr_intrusive", text: "The advertisement was intrusive.", reverse: false, active: true },
                { item_id: "intr_invasive", text: "The advertisement was invasive.", reverse: false, active: true },
                { item_id: "react_resist", text: "I want to resist the advertisement.", reverse: false, active: true },
                { item_id: "react_dismiss", text: "I want to dismiss the advertisement.", reverse: false, active: true },
            ],
        },
        // ============================================
        // SCALE 3: Attitude Toward the Ad
        // ============================================
        {
            scale_id: "attitude",
            scale_label: "Attitude Toward the Ad",
            type: "semantic_differential",
            items: [
                { item_id: "att_good", prompt: "The advertisement is", left: "Bad", right: "Good", active: true },
                { item_id: "att_pleasant", prompt: "The advertisement is", left: "Unpleasant", right: "Pleasant", active: true },
                { item_id: "att_favorable", prompt: "My reaction towards the advertisement is", left: "Unfavorable", right: "Favorable", active: true },
                { item_id: "att_like", prompt: "I ... the advertisement", left: "Dislike", right: "Like", active: true },
            ],
        },
        // ============================================
        // SCALE 4: Purchase Intention
        // ============================================
        {
            scale_id: "purchase_intention",
            scale_label: "Purchase Intention",
            type: "likert",
            items: [
                { item_id: "click_intent", text: "I would like to click through the audio advertisement to acquire further information.", reverse: false, active: true },
                { item_id: "purchase_likelihood", text: "The likelihood of purchasing the app FocusFlow is", reverse: false, active: true },
                { item_id: "purchase_probability", text: "The probability that I would consider buying the app FocusFlow is", reverse: false, active: true },
                { item_id: "purchase_willingness", text: "My willingness to buy the app FocusFlow is", reverse: false, active: true },
            ],
        },
        // ============================================
        // SCALE 5: Privacy Concerns
        // ============================================
        {
            scale_id: "privacy_concerns",
            scale_label: "Privacy Concerns",
            type: "likert",
            items: [
                { item_id: "priv_1", text: "All things considered, the Internet would cause serious privacy problems.", reverse: false, active: true },
                { item_id: "priv_2", text: "Compared to others, I am more sensitive about the way online companies handle my personal information.", reverse: false, active: true },
                { item_id: "priv_3", text: "To me, it is the most important thing to keep my privacy intact from online companies.", reverse: false, active: true },
                { item_id: "priv_4", text: "I am concerned about threats to my personal privacy today.", reverse: false, active: true },
            ],
        },
    ],
};
