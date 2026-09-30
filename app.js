import { 
    calculateItemsPerMinute, 
    extractAndSortRecipes, 
    calculateProductionTree,
    aggregateTotals,
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
        
        outputElement.innerHTML = `Bitte wähle oben ein Rezept aus.`;
        
    } catch (error) {
        console.error("Fehler beim Laden:", error);
        outputElement.innerHTML = `<p style="color: #ef4444;">Fehler beim Laden der DocsRecipes.json.</p>`;
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
    const dashboardCard = document.getElementById('dashboard-card');
    const targetInput = document.getElementById('target-rate');
    const outputElement = document.getElementById('status-output');
    
    if (selectedIndex === "") {
        currentSelectedRecipe = null;
        targetContainer.style.display = 'none';
        dashboardCard.style.display = 'none';
        outputElement.innerHTML = `Bitte wähle ein Rezept aus.`;
        return;
    }
    
    currentSelectedRecipe = availableRecipes[selectedIndex];
    
    if (!currentSelectedRecipe.products || currentSelectedRecipe.products.length === 0) {
        targetContainer.style.display = 'none';
        dashboardCard.style.display = 'none';
        outputElement.innerHTML = `<p>Dieses Rezept erzeugt keine direkten Produkte.</p>`;
        return;
    }

    const baseOutputRate = calculateItemsPerMinute(currentSelectedRecipe.duration, currentSelectedRecipe.products[0].amount);
    targetInput.value = baseOutputRate.toFixed(1);
    
    targetContainer.style.display = 'block';
    dashboardCard.style.display = 'block';
    updateCalculationUI();
}

function renderTreeHTML(node) {
    if (node.isRaw) {
        return `
            <div class="raw-material">
                <span class="raw-name">${node.name} (Rohstoff)</span>
                <span class="raw-rate">- ${node.requiredRate.toFixed(2)} / min</span>
            </div>
        `;
    }

    let html = `
        <div class="tree-node">
            <div class="node-header">
                <div>
                    <div class="item-name">${node.recipeName}</div>
                    <div class="machine-info"><span class="machine-count">${node.machinesNeeded.toFixed(2)}x</span> ${node.machineName}</div>
                </div>
                <div class="item-rate">${node.targetRate.toFixed(2)} / min</div>
            </div>
    `;

    if (node.ingredients && node.ingredients.length > 0) {
        html += `<div class="tree-children">`;
        node.ingredients.forEach(ing => {
            html += renderTreeHTML(ing);
        });
        html += `</div>`;
    }

    html += `</div>`;
    return html;
}

function updateCalculationUI() {
    if (!currentSelectedRecipe) return;

    const outputElement = document.getElementById('status-output');
    const statMachines = document.getElementById('stat-machines');
    const statPower = document.getElementById('stat-power');
    const targetRate = parseFloat(document.getElementById('target-rate').value) || 0;
    
    // 1. Baum berechnen
    const productionTree = calculateProductionTree(currentSelectedRecipe, targetRate, availableRecipes);
    
    // 2. Gesamtsummen aggregieren
    const totals = aggregateTotals(productionTree);
    statMachines.textContent = totals.machines.toFixed(1);
    statPower.textContent = `~${totals.power.toFixed(0)} MW`;

    // 3. UI rendern
    outputElement.innerHTML = renderTreeHTML(productionTree);
}

document.addEventListener('DOMContentLoaded', initApp);
