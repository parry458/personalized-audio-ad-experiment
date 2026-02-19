// Function to derive age range (copied from source for testing)
function deriveAgeRange(age: number): string {
    if (age >= 18 && age <= 19) return 'if you are below 20';
    if (age >= 20 && age <= 29) return 'in your 20s';
    if (age >= 30 && age <= 39) return 'in your 30s';
    if (age >= 40 && age <= 49) return 'in your 40s';
    if (age >= 50 && age <= 59) return 'in your 50s';
    if (age >= 60 && age <= 69) return 'in your 60s';
    if (age >= 70 && age <= 79) return 'in your 70s';
    if (age >= 80 && age <= 99) return 'in your 80s';
    return 'in your current stage of life';
}

console.log('Testing Age Range Logic:');
console.log('19 ->', deriveAgeRange(19));
console.log('25 ->', deriveAgeRange(25));
console.log('44 ->', deriveAgeRange(44));
console.log('85 ->', deriveAgeRange(85));
console.log('17 ->', deriveAgeRange(17)); // Should be fallback
console.log('100 ->', deriveAgeRange(100)); // Should be fallback
