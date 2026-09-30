import {
    calculateItemsPerMinute,
    extractAndSortRecipes,
    calculateProductionTree,
    aggregateTotals,
    runAllTests
} from './calculator.js';


let availableRecipes = [];
let currentSelectedRecipe = null;


/* =========================================================
   APP INITIALISIEREN
   ========================================================= */

async function initApp() {

    const select =
        document.getElementById('recipe-select');

    const target =
        document.getElementById('target-rate');

    const output =
        document.getElementById('status-output');

    const testStatus =
        document.getElementById('test-status');


    /* -----------------------------------------------------
       TESTS
       ----------------------------------------------------- */

    const testsPassed = runAllTests();

    testStatus.textContent =
        testsPassed
            ? 'Tests: OK ✓'
            : 'Tests: FEHLER ✗';


    if (!testsPassed) {

        testStatus.classList.add('error');

        output.textContent =
            'Logik-Tests fehlgeschlagen. Siehe Konsole.';

        return;
    }


    /* -----------------------------------------------------
       REZEPTDATEN LADEN
       ----------------------------------------------------- */

    try {

        const response =
            await fetch('DocsRecipes.json');


        if (!response.ok) {
            throw new Error(
                'Netzwerk-Antwort war nicht ok'
            );
        }


        const rawJsonData =
            await response.json();


        availableRecipes =
            extractAndSortRecipes(rawJsonData);


        populateSelectDropdown(
            select,
            availableRecipes
        );


        select.addEventListener(
            'change',
            handleRecipeSelection
        );


        target.addEventListener(
            'input',
            updateCalculationUI
        );


        output.textContent =
            'Bitte wähle oben ein Rezept aus.';

    } catch (error) {

        console.error(
            'Fehler beim Laden:',
            error
        );


        output.textContent =
            'Fehler beim Laden der DocsRecipes.json.';
    }
}


/* =========================================================
   DROPDOWN FÜLLEN
   ========================================================= */

function populateSelectDropdown(
    selectElement,
    recipes
) {

    selectElement.innerHTML =
        '<option value="">-- Rezept wählen --</option>';


    recipes.forEach(
        (recipe, index) => {

            const option =
                document.createElement('option');


            option.value =
                index;


            option.textContent =
                recipe.name;


            selectElement.appendChild(
                option
            );
        }
    );
}


/* =========================================================
   REZEPT AUSGEWÄHLT
   ========================================================= */

function handleRecipeSelection(event) {

    const selectedIndex =
        event.target.value;


    const targetContainer =
        document.getElementById(
            'target-container'
        );


    const targetInput =
        document.getElementById(
            'target-rate'
        );


    const output =
        document.getElementById(
            'status-output'
        );


    /* Keine Auswahl */

    if (selectedIndex === '') {

        currentSelectedRecipe = null;


        targetContainer.style.display =
            'none';


        output.textContent =
            'Bitte wähle ein Rezept aus.';


        resetStats();

        return;
    }


    currentSelectedRecipe =
        availableRecipes[selectedIndex];


    /* Rezept ohne Produkt */

    if (
        !currentSelectedRecipe.products ||
        currentSelectedRecipe.products.length === 0
    ) {

        targetContainer.style.display =
            'none';


        output.textContent =
            'Dieses Rezept erzeugt keine direkten Produkte.';


        resetStats();

        return;
    }


    /* Basisproduktion des gewählten Rezepts */

    const baseOutputRate =
        calculateItemsPerMinute(
            currentSelectedRecipe.duration,
            currentSelectedRecipe.products[0].amount
        );


    targetInput.value =
        baseOutputRate.toFixed(1);


    targetContainer.style.display =
        'flex';


    updateCalculationUI();
}


/* =========================================================
   INITIALEN FÜR ROOT BADGE
   ========================================================= */

function initials(name = '') {

    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word[0])
        .join('')
        .toUpperCase() || 'FI';
}


/* =========================================================
   EINEN PRODUKTIONSKNOTEN RENDERN
   ========================================================= */

function renderNode(
    node,
    isRoot = false
) {

    /* -----------------------------------------------------
       ROHSTOFF
       ----------------------------------------------------- */

    if (node.isRaw) {

        return `
            <div class="production-card raw">

                <div class="card-row">

                    <div class="card-left">

                        <div class="machine-badge">
                            RAW
                        </div>

                        <div class="item-copy">

                            <div class="item-name">
                                ${node.name}
                            </div>

                            <div class="machine-name">
                                Rohstoff
                            </div>

                        </div>

                    </div>


                    <div class="item-rate">
                        ${node.requiredRate.toFixed(1)}
                        <small>/min</small>
                    </div>

                </div>

            </div>
        `;
    }


    /* -----------------------------------------------------
       NORMALES REZEPT / ROOT
       ----------------------------------------------------- */

    const badgeContent =
        isRoot
            ? initials(node.recipeName)
            : `${node.machinesNeeded.toFixed(2)}x`;


    const subText =
        isRoot
            ? 'Zielprodukt (Output)'
            : node.machineName;


    let html = `
        <div class="${isRoot ? 'target-card' : 'production-card'}">

            <div class="card-row">

                <div class="card-left">

                    <div class="machine-badge">
                        ${badgeContent}
                    </div>


                    <div class="item-copy">

                        <div class="item-name">
                            ${node.recipeName}
                        </div>

                        <div class="${isRoot ? 'target-note' : 'machine-name'}">
                            ${subText}
                        </div>

                    </div>

                </div>


                <div class="item-rate">

                    ${node.targetRate.toFixed(1)}

                    <small>
                        /min
                    </small>

                </div>

            </div>
    `;


    /* -----------------------------------------------------
       KINDER
       ----------------------------------------------------- */

    if (
        !isRoot &&
        node.ingredients &&
        node.ingredients.length > 0
    ) {

        html += `
            <div class="tree-children">
        `;


        node.ingredients.forEach(
            ingredient => {

                html +=
                    renderNode(
                        ingredient
                    );
            }
        );


        html += `
            </div>
        `;
    }


    html += `
        </div>
    `;


    return html;
}


/* =========================================================
   UI AKTUALISIEREN
   ========================================================= */

function updateCalculationUI() {

    if (!currentSelectedRecipe) {
        return;
    }


    const targetRate =
        parseFloat(
            document.getElementById(
                'target-rate'
            ).value
        ) || 0;


    /* -----------------------------------------------------
       PRODUKTIONSBAUM BERECHNEN
       ----------------------------------------------------- */

    const productionTree =
        calculateProductionTree(
            currentSelectedRecipe,
            targetRate,
            availableRecipes
        );


    /* -----------------------------------------------------
       GESAMTWERTE
       ----------------------------------------------------- */

    const totals =
        aggregateTotals(
            productionTree
        );


    document.getElementById(
        'stat-machines'
    ).textContent =
        `${totals.machines.toFixed(2)}x`;


    document.getElementById(
        'stat-power'
    ).textContent =
        `${totals.power.toFixed(1)} MW`;


    /* -----------------------------------------------------
       ROOT CHILDREN
       ----------------------------------------------------- */

    const children =
        productionTree.ingredients
            ?.map(node => renderNode(node))
            .join('') || '';


    /* -----------------------------------------------------
       UI RENDERN
       ----------------------------------------------------- */

    let html =
        renderNode(
            productionTree,
            true
        );


    if (children) {

        html += `
            <div class="section-label">
                Benötigte Maschinen & Zwischenprodukte:
            </div>

            ${children}
        `;
    }


    document.getElementById(
        'recipe-tree'
    ).innerHTML =
        html;
}


/* =========================================================
   STATISTIK ZURÜCKSETZEN
   ========================================================= */

function resetStats() {

    document.getElementById(
        'stat-machines'
    ).textContent =
        '0.0x';


    document.getElementById(
        'stat-power'
    ).textContent =
        '0 MW';
}


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    'DOMContentLoaded',
    initApp
);
