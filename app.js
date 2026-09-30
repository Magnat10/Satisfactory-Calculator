import { recipesData } from './data.js';
import { calculateItemsPerMinute, testCalculateItemsPerMinute } from './calculator.js';

function initApp() {
    const outputElement = document.getElementById('status-output');
    
    // 1. Tests ausführen
    const isTestPassed = testCalculateItemsPerMinute();
    
    // 2. Daten laden (Wir nutzen Quartz Crystal als ersten Testlauf)
    const recipe = recipesData["Recipe_QuartzCrystal_C"][0];
    
    // 3. Berechnung durchführen
    // Gemäß der Quelle benötigt Recipe_QuartzCrystal_C 8 Sekunden[cite: 2].
    // Es produziert 3 Desc_QuartzCrystal_C[cite: 2].
    const duration = recipe.duration;
    const productAmount = recipe.products[0].amount;
    const itemsPerMinute = calculateItemsPerMinute(duration, productAmount);
    
    // 4. UI aktualisieren
    outputElement.innerHTML = `
        <h2 style="margin-bottom: 1rem;">System Status</h2>
        <p>Logik-Tests bestanden: <strong class="${isTestPassed ? 'success-text' : ''}">${isTestPassed ? 'Ja' : 'Nein'}</strong></p>
        <hr style="border-color: #374151; margin: 1rem 0;">
        <h3 style="margin-bottom: 0.5rem; color: var(--ficsit-orange);">Beispiel-Berechnung</h3>
        <p><strong>Rezept:</strong> ${recipe.name}</p>
        <p><strong>Dauer:</strong> ${duration}s</p>
        <p><strong>Output pro Zyklus:</strong> ${productAmount}x</p>
        <p style="margin-top: 0.5rem; font-size: 1.1rem;">
            <strong>Produktionsrate:</strong> ${itemsPerMinute} / min
        </p>
    `;
}

// Starten, sobald das DOM geladen ist
document.addEventListener('DOMContentLoaded', initApp);