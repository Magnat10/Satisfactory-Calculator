/**
 * Berechnet die Rate von Items pro Minute.
 * Satisfactory arbeitet mit 60-Sekunden-Zyklen.
 * 
 * @param {number} duration - Die Herstellungsdauer in Sekunden.
 * @param {number} amount - Die Menge der Zutaten oder Produkte pro Zyklus.
 * @returns {number} Die Items pro Minute.
 */
export function calculateItemsPerMinute(duration, amount) {
    if (duration <= 0) return 0;
    return (60 / duration) * amount;
}

/**
 * QUALITÄTSSICHERUNG / TESTFALL
 * Testet die Berechnung anhand des Rezepts "Quartz Crystal".
 * Laut Quellen: Dauer = 8 Sekunden, Produktmenge = 3[cite: 2].
 * Manuelle Rechnung: (60 / 8) * 3 = 7.5 Zyklen/Min * 3 = 22.5 Items/Min.
 * 
 * @returns {boolean} True wenn der Test erfolgreich ist.
 */
export function testCalculateItemsPerMinute() {
    const testDuration = 8;
    const testAmount = 3;
    const expectedRate = 22.5;
    
    const result = calculateItemsPerMinute(testDuration, testAmount);
    
    if (result !== expectedRate) {
        console.error(`[TEST FEHLGESCHLAGEN] Erwartet: ${expectedRate}, Erhalten: ${result}`);
        return false;
    }
    
    console.log(`[TEST ERFOLGREICH] Rate korrekt berechnet: ${result} Items/Min`);
    return true;
}