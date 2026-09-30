/**
 * Berechnet die Rate von Items pro Minute (60-Sekunden-Zyklen).
 * 
 * @param {number} duration - Die Herstellungsdauer in Sekunden.
 * @param {number} amount - Die Menge pro Zyklus.
 * @returns {number} Die Items pro Minute.
 */
export function calculateItemsPerMinute(duration, amount) {
    if (duration <= 0) return 0;
    return (60 / duration) * amount;
}

/**
 * Wandelt das verschachtelte JSON-Objekt in ein flaches, sortiertes Array um.
 * 
 * @param {Object} rawData - Die rohen JSON-Daten.
 * @returns {Array} Ein Array mit Rezept-Objekten.
 */
export function extractAndSortRecipes(rawData) {
    const recipes = [];
    for (const key in rawData) {
        // Die JSON-Struktur enthält Arrays mit je einem Rezept-Objekt
        const recipeObj = rawData[key][0]; 
        if (recipeObj && recipeObj.name) {
            recipes.push(recipeObj);
        }
    }
    // Alphabetisch nach dem Namen des Rezepts sortieren
    return recipes.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * QUALITÄTSSICHERUNG / TESTFÄLLE
 * Führt alle Logik-Tests aus.
 */
export function runAllTests() {
    let allPassed = true;

    // Test 1: Rate berechnen (Quartz Crystal: 8s Dauer, 3 Items -> 22.5/min)
    const rateResult = calculateItemsPerMinute(8, 3);
    if (rateResult !== 22.5) {
        console.error(`[TEST 1 FEHLGESCHLAGEN] Rate: Erwartet 22.5, Erhalten ${rateResult}`);
        allPassed = false;
    }

    // Test 2: Daten extrahieren und sortieren
    const mockData = {
        "Recipe_B": [{ name: "Z-Item", duration: 10 }],
        "Recipe_A": [{ name: "A-Item", duration: 5 }]
    };
    const extracted = extractAndSortRecipes(mockData);
    if (extracted.length !== 2 || extracted[0].name !== "A-Item") {
        console.error(`[TEST 2 FEHLGESCHLAGEN] Extraktion/Sortierung fehlerhaft.`);
        allPassed = false;
    }

    if (allPassed) console.log("[TESTS ERFOLGREICH] Alle Logik-Tests bestanden.");
    return allPassed;
}
