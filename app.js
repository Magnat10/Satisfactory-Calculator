import { 
    calculateItemsPerMinute, 
    calculateMachineCount, 
    extractAndSortRecipes, 
    cleanItemName,
    runAllTests 
} from './calculator.js';

let availableRecipes = [];
let currentSelectedRecipe = null;

async function initApp() {
    const selectElement = document.getElementById('recipe-select');
    const targetInput = document.getElementById('target-rate');
    const outputElement = document.getElementById('status-output');
    
    const isTestPassed = runAllTests();
    if (!isTestPassed) {
        outputElement.innerHTML = `<p style="color: #ef4444;">Logik-Tests fehlgeschlagen. Siehe Konsole.</p>`;
        return;
    }

    try {
        const response = await fetch('DocsRecipes.json');
        if (!response.ok) throw new Error('Netzwerk-Antwort war nicht ok');
        
        const rawJsonData = await response.json();
        availableRecipes = extractAndSortRecipes(rawJsonData);
        
        populateSelectDropdown(selectElement, availableRecipes);
        
        // Event-Listener für Rezept-Wechsel und Rate-Eingabe
        selectElement.addEventListener('change', handleRecipeSelection);
        targetInput.addEventListener('input', updateCalculationUI);
        
        outputElement.innerHTML = `<p class="success-text">Datenbank geladen. Bitte wähle ein Rezept.</p>`;
        
    } catch (error) {
        console.error("Fehler beim Laden:", error);
        outputElement.innerHTML = `<p style="color: #ef4444;">Fehler beim Laden der Rezeptdaten.</p>`;
    }
}

function populateSelectDropdown(selectElement, recipes) {
    selectElement.innerHTML = `<option value="">-- Rezept wählen --</option>`;
    recipes.forEach((recipe, index) => {
        const option = document.createElement('option');
        option.value = index; 
        option.textContent = recipe.name;
        selectElement.appendChild(option);
    });
}

function handleRecipeSelection(event) {
    const selectedIndex = event.target.value;
    const targetContainer = document.getElementById('target-container');
    const targetInput = document.getElementById('target-rate');
    
    if (selectedIndex === "") {
        currentSelectedRecipe = null;
        targetContainer.style.display = 'none';
        document.getElementById('status-output').innerHTML = `Bitte wähle ein Rezept aus.`;
        return;
    }
    
    currentSelectedRecipe = availableRecipes[selectedIndex];
    
    if (!currentSelectedRecipe.products || currentSelectedRecipe.products.length === 0) {
        targetContainer.style.display = 'none';
        document.getElementById('status-output').innerHTML = `<p>Dieses Rezept erzeugt keine direkten Produkte.</p>`;
        return;
    }

    // Setze das Eingabefeld standardmäßig auf die Leistung von genau 1 Maschine
    const baseOutputRate = calculateItemsPerMinute(currentSelectedRecipe.duration, currentSelectedRecipe.products[0].amount);
    targetInput.value = baseOutputRate.toFixed(1);
    
    // Zeige das Eingabefeld und berechne das UI
    targetContainer.style.display = 'block';
    updateCalculationUI();
}

function updateCalculationUI() {
    if (!currentSelectedRecipe) return;

    const outputElement = document.getElementById('status-output');
    const targetRate = parseFloat(document.getElementById('target-rate').value) || 0;
    
    const duration = currentSelectedRecipe.duration;
    const primaryProduct = currentSelectedRecipe.products[0];
    
    // Basis-Output einer einzelnen Maschine
    const baseOutputPerMachine = calculateItemsPerMinute(duration, primaryProduct.amount);
    
    // Benötigte Maschinen berechnen
    const machinesNeeded = calculateMachineCount(targetRate, baseOutputPerMachine);
    const machineName = currentSelectedRecipe.producedIn.length > 0 
                        ? cleanItemName(currentSelectedRecipe.producedIn[0]) 
                        : "Manual Crafting";

    // Zutaten-Liste generieren
    let ingredientsHtml = '<ul class="ingredient-list">';
    if (currentSelectedRecipe.ingredients && currentSelectedRecipe.ingredients.length > 0) {
        currentSelectedRecipe.ingredients.forEach(ing => {
            const baseIngRate = calculateItemsPerMinute(duration, ing.amount);
            const totalIngNeeded = baseIngRate * machinesNeeded;
            const ingName = cleanItemName(ing.item);
            
            ingredientsHtml += `
                <li class="ingredient-item">
                    <span>${ingName}</span>
                    <span style="color: #ef4444; font-weight: bold;">- ${totalIngNeeded.toFixed(2)} / min</span>
                </li>
            `;
        });
    } else {
        ingredientsHtml += `<li class="ingredient-item">Keine Zutaten benötigt</li>`;
    }
    ingredientsHtml += '</ul>';

    // UI Rendern
    outputElement.innerHTML = `
        <h2 style="color: var(--ficsit-orange); margin-bottom: 0.5rem;">${currentSelectedRecipe.name}</h2>
        
        <div class="data-row" style="margin-bottom: 1rem;">
            <span class="data-label">Produziert in:</span>
            <span>${machineName}</span>
        </div>
        
        <div class="data-row" style="border-bottom: none; margin-bottom: 0;">
            <span class="data-label">Benötigte Maschinen:</span>
            <span class="machine-highlight">${machinesNeeded.toFixed(2)}x</span>
        </div>

        <hr style="border-color: var(--border-color); margin: 1rem 0;">
        
        <h3 style="font-size: 0.9rem; color: var(--text-muted); text-transform: uppercase;">Benötigte Ressourcen (Inputs)</h3>
        ${ingredientsHtml}
    `;
}

document.addEventListener('DOMContentLoaded', initApp);
