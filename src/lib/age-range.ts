/**
 * Computes the standardized age range string for a given age.
 * This is the SINGLE SOURCE OF TRUTH for age range logic.
 * 
 * Mappings:
 * 18-19  -> "if you are below 20"
 * 20-29  -> "in your 20s"
 * 30-39  -> "in your 30s"
 * 40-49  -> "in your 40s"
 * 50-59  -> "in your 50s"
 * 60-69  -> "in your 60s"
 * 70-79  -> "in your 70s"
 * 80-99  -> "in your 80s"
 * Default -> "in your 20s" (Safe fallback)
 */
export function computeAgeRange(age: number): string {
    if (age <= 19) return "if you are below 20";
    if (age >= 20 && age <= 29) return "in your 20s";
    if (age >= 30 && age <= 39) return "in your 30s";
    if (age >= 40 && age <= 49) return "in your 40s";
    if (age >= 50 && age <= 59) return "in your 50s";
    if (age >= 60 && age <= 69) return "in your 60s";
    if (age >= 70 && age <= 79) return "in your 70s";
    if (age >= 80) return "in your 80s";

    // Fallback for safety (though strictly should be covered)
    return "in your 20s";
}
