import { 
    calculateItemsPerMinute, 
    extractAndSortRecipes, 
    calculateProductionTree,
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

    const baseOutputRate = calculateItemsPerMinute(currentSelectedRecipe.duration, currentSelectedRecipe.products[0].amount);
    targetInput.value = baseOutputRate.toFixed(1);
    
    targetContainer.style.display = 'block';
    updateCalculationUI();
}

/**
 * Baut rekursiv das HTML für den Produktionsbaum auf.
 */
function renderTreeHTML(node) {
    if (node.isRaw) {
        return `
            <div class="data-row" style="border:none; margin: 0.25rem 0; padding-bottom: 0;">
                <span style="color: var(--text-muted); font-style: italic;">Rohstoff: ${node.name}</span>
                <span style="color: #ef4444; font-weight: bold;">- ${node.requiredRate.toFixed(2)} / min</span>
            </div>
        `;
    }

    let html = `
        <div style="margin-top: 0.75rem;">
            <div class="data-row" style="border:none; margin-bottom: 0.25rem; padding-bottom: 0;">
                <span style="font-weight: bold; color: var(--text-main);">${node.recipeName}</span>
                <span style="color: #ef4444; font-weight: bold;">- ${node.targetRate.toFixed(2)} / min</span>
            </div>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">
                ${node.machinesNeeded.toFixed(2)}x ${node.machineName}
            </div>
            <div class="tree-node">
    `;

    node.ingredients.forEach(ing => {
        html += renderTreeHTML(ing);
    });

    html += `</div></div>`;
    return html;
}

function updateCalculationUI() {
    if (!currentSelectedRecipe) return;

    const outputElement = document.getElementById('status-output');
    const targetRate = parseFloat(document.getElementById('target-rate').value) || 0;
    
    // 1. Baum berechnen
    const productionTree = calculateProductionTree(currentSelectedRecipe, targetRate, availableRecipes);
    
    // 2. HTML aus dem Baum generieren
    outputElement.innerHTML = `
        <h2 style="color: var(--ficsit-orange); margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
            Produktionsplan
        </h2>
        ${renderTreeHTML(productionTree)}
    `;
}

document.addEventListener('DOMContentLoaded', initApp);
