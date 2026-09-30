import { calculateItemsPerMinute, extractAndSortRecipes, runAllTests } from './calculator.js';

// Globaler Speicher für unsere formatierten Rezepte
let availableRecipes = [];

async function initApp() {
    const selectElement = document.getElementById('recipe-select');
    const outputElement = document.getElementById('status-output');
    
    // 1. Logik testen
    const isTestPassed = runAllTests();
    if (!isTestPassed) {
        outputElement.innerHTML = `<p style="color: #ef4444;">Kritischer Fehler: Logik-Tests fehlgeschlagen. Siehe Konsole.</p>`;
        return;
    }

    // 2. Daten laden (fetch)
    try {
        const response = await fetch('DocsRecipes.json');
        if (!response.ok) throw new Error('Netzwerk-Antwort war nicht ok');
        
        const rawJsonData = await response.json();
        
        // 3. Daten formatieren und im globalen Speicher ablegen
        availableRecipes = extractAndSortRecipes(rawJsonData);
        
        // 4. Dropdown-Menü füllen
        populateSelectDropdown(selectElement, availableRecipes);
        
        // 5. Event-Listener anbinden
        selectElement.addEventListener('change', handleRecipeSelection);
        
        outputElement.innerHTML = `<p class="success-text">FICSIT-Datenbank geladen. ${availableRecipes.length} Rezepte gefunden. Bitte oben auswählen.</p>`;
        
    } catch (error) {
        console.error("Fehler beim Laden der Daten:", error);
        outputElement.innerHTML = `<p style="color: #ef4444;">Fehler beim Laden der DocsRecipes.json. Stelle sicher, dass die Datei im selben Ordner auf GitHub liegt.</p>`;
        selectElement.innerHTML = `<option>Fehler beim Laden</option>`;
    }
}

function populateSelectDropdown(selectElement, recipes) {
    selectElement.innerHTML = `<option value="">-- Rezept wählen --</option>`;
    
    recipes.forEach((recipe, index) => {
        const option = document.createElement('option');
        // Wir nutzen den Index des Arrays als Value, um das Rezept später schnell zu finden
        option.value = index; 
        option.textContent = recipe.name;
        selectElement.appendChild(option);
    });
}

function handleRecipeSelection(event) {
    const outputElement = document.getElementById('status-output');
    const selectedIndex = event.target.value;
    
    if (selectedIndex === "") {
        outputElement.innerHTML = `Bitte wähle ein Rezept aus.`;
        return;
    }
    
    const recipe = availableRecipes[selectedIndex];
    
    // Prüfen, ob das Rezept Produkte hat
    if (!recipe.products || recipe.products.length === 0) {
        outputElement.innerHTML = `
            <h2 style="color: var(--ficsit-orange); margin-bottom: 1rem;">${recipe.name}</h2>
            <p>Dieses Rezept erzeugt keine direkten Produkte (z.B. Gebäude oder Customizer-Items).</p>
        `;
        return;
    }

    // Für den Anfang berechnen wir das erste Produkt in der Liste
    const firstProduct = recipe.products[0];
    const duration = recipe.duration;
    const itemsPerMinute = calculateItemsPerMinute(duration, firstProduct.amount);
    
    // UI aktualisieren (Mobile First Darstellung)
    outputElement.innerHTML = `
        <h2 style="color: var(--ficsit-orange); margin-bottom: 1rem;">${recipe.name}</h2>
        
        <div class="data-row">
            <span class="data-label">Produktionszeit pro Zyklus:</span>
            <span>${duration}s</span>
        </div>
        
        <div class="data-row">
            <span class="data-label">Output pro Zyklus:</span>
            <span>${firstProduct.amount}x</span>
        </div>
        
        <div class="data-row" style="margin-top: 1rem; border-bottom: none;">
            <span class="data-label" style="font-weight: bold; color: white;">Produktionsrate:</span>
            <span style="font-size: 1.25rem; font-weight: bold; color: #4ade80;">
                ${itemsPerMinute.toFixed(2)} / min
            </span>
        </div>
    `;
}

// App starten
document.addEventListener('DOMContentLoaded', initApp);
