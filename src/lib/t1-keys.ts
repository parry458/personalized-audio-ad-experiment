export const T1_KEY_MAP: Record<string, { old: string[] }> = {
    // A) Click-through + Purchase intention
    click_intent: { old: ["pi0_click"] },
    purchase_likelihood: { old: ["pi1"] },
    purchase_probability: { old: ["pi2"] },
    purchase_willingness: { old: ["pi3"] },

    // B) Attitude toward the ad
    att_good: { old: ["att1"] },
    att_pleasant: { old: ["att2"] },
    att_favorable: { old: ["att3"] },
    att_like: { old: ["att4"] },

    // C) Intrusiveness / reactance block
    intr_distracting: { old: ["int1"] },
    intr_forced: { old: ["int3"] },
    intr_interfering: { old: ["int4"] },
    intr_intrusive: { old: ["int5"] },
    intr_invasive: { old: ["int6"] },
    react_resist: { old: ["int8"] },
    react_dismiss: { old: ["int9"] },

    // D) Relevance block
    rel_important: { old: ["rel1"] },
    rel_value: { old: ["rel5"] },
    rel_needs: { old: ["rel6"] },
    rel_useful: { old: ["rel7"] },
    rel_interesting: { old: ["rel9"] },

    // E) Privacy concerns
    priv_1: { old: ["priv1"] },
    priv_2: { old: ["priv2"] },
    priv_3: { old: ["priv3"] },
    priv_4: { old: ["priv4"] },

    // F) Podcast frequency (unchanged)
    podcast_frequency: { old: ["podcast_frequency"] }
};

/**
 * Normalizes old T1 survey keys to their new format for backward compatibility.
 * If the new key already exists, it is prioritized. If only the old key exists,
 * its value is assigned to the new key.
 */
export function normalizeT1Answers(rawAnswers: Record<string, any>): Record<string, any> {
    if (!rawAnswers) return {};

    const normalized = { ...rawAnswers };

    for (const [newKey, config] of Object.entries(T1_KEY_MAP)) {
        // If the normalized object doesn't have the new key, check if any old key exists
        if (normalized[newKey] === undefined) {
            for (const oldKey of config.old) {
                if (normalized[oldKey] !== undefined) {
                    normalized[newKey] = normalized[oldKey];
                    break; // Use the first found old key value
                }
            }
        }
    }

    return normalized;
}
