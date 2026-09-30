/**
 * Berechnet die Rate von Items pro Minute (60-Sekunden-Zyklen).
 */
export function calculateItemsPerMinute(duration, amount) {
    if (duration <= 0) return 0;
    return (60 / duration) * amount;
}

/**
 * Berechnet, wie viele Maschinen für eine gewünschte Zielrate benötigt werden.
 */
export function calculateMachineCount(targetRate, baseRatePerMachine) {
    if (baseRatePerMachine <= 0) return 0;
    return targetRate / baseRatePerMachine;
}

/**
 * Wandelt das verschachtelte JSON-Objekt in ein flaches, sortiertes Array um.
 */
export function extractAndSortRecipes(rawData) {
    const recipes = [];
    for (const key in rawData) {
        const recipeObj = rawData[key][0]; 
        if (recipeObj && recipeObj.name) {
            recipes.push(recipeObj);
        }
    }
    return recipes.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Säubert die internen Item-Namen (z.B. "Desc_IronIngot_C" -> "Iron Ingot").
 */
export function cleanItemName(rawName) {
    if (!rawName) return "Unknown Item";
    return rawName
        .replace('Desc_', '')
        .replace('BP_EquipmentDescriptor', '')
        .replace('_C', '')
        .replace(/([A-Z])/g, ' $1') // Fügt Leerzeichen vor Großbuchstaben ein
        .trim();
}

/**
 * QUALITÄTSSICHERUNG / TESTFÄLLE
 */
export function runAllTests() {
    let allPassed = true;

    // Test 1: Iron Plate Logik
    // Dauer: 6s, Produziert: 2, Zutat: 3 Iron Ingot
    const duration = 6;
    const productAmount = 2;
    const ingredientAmount = 3;
    
    const baseRate = calculateItemsPerMinute(duration, productAmount); // (60/6)*2 = 20
    if (baseRate !== 20) {
        console.error(`[TEST 1 FEHLGESCHLAGEN] Basisrate: Erwartet 20, Erhalten ${baseRate}`);
        allPassed = false;
    }

    // Test 2: Maschinenbedarf für 50 Iron Plates / min
    const targetRate = 50;
    const machinesNeeded = calculateMachineCount(targetRate, baseRate); // 50 / 20 = 2.5
    if (machinesNeeded !== 2.5) {
        console.error(`[TEST 2 FEHLGESCHLAGEN] Maschinen: Erwartet 2.5, Erhalten ${machinesNeeded}`);
        allPassed = false;
    }

    // Test 3: Benötigte Zutaten (Iron Ingot) für 2.5 Maschinen
    const ingredientBaseRate = calculateItemsPerMinute(duration, ingredientAmount); // (60/6)*3 = 30
    const totalIngredientsNeeded = ingredientBaseRate * machinesNeeded; // 30 * 2.5 = 75
    if (totalIngredientsNeeded !== 75) {
        console.error(`[TEST 3 FEHLGESCHLAGEN] Zutaten: Erwartet 75, Erhalten ${totalIngredientsNeeded}`);
        allPassed = false;
    }

    if (allPassed) console.log("[TESTS ERFOLGREICH] Alle Logik-Tests bestanden.");
    return allPassed;
}
