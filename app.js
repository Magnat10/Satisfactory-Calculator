import { extractAndSortRecipes, calculateProductionTree, aggregateTotals, runAllTests } from "./calculator.js";

let availableRecipes = [];
let currentSelectedRecipe = null;

function setTestStatusOk() {
  const el = document.getElementById("test-status");
  if (!el) return;
  el.textContent = "Tests: OK ✓";
  el.className =
    "text-xs bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded border border-emerald-700/50";
}

function setTestStatusFail() {
  const el = document.getElementById("test-status");
  if (!el) return;
  el.textContent = "Tests: FEHLER ✗";
  el.className =
    "text-xs bg-rose-900/50 text-rose-400 px-2 py-0.5 rounded border border-rose-700/50";
}

function setTestStatusRunning() {
  const el = document.getElementById("test-status");
  if (!el) return;
  el.textContent = "Tests: Läuft...";
  el.className =
    "text-xs bg-emerald-900/20 text-emerald-200 px-2 py-0.5 rounded border border-emerald-700/20";
}

function populateSelectDropdown(selectElement, recipes) {
  selectElement.innerHTML = `<option value="">-- Rezept wählen --</option>`;
  recipes.forEach((recipe, index) => {
    const option = document.createElement("option");
    option.value = String(index); // wir bleiben kompatibel mit deiner bisherigen Logik
    option.textContent = recipe.name;
    selectElement.appendChild(option);
  });
}

function handleRecipeSelection(event) {
  const selectedIndex = event.target.value;
  const targetInput = document.getElementById("target-rate");

  if (selectedIndex === "") {
    currentSelectedRecipe = null;
    resetUIToEmptyState();
    return;
  }

  currentSelectedRecipe = availableRecipes[Number(selectedIndex)];

  if (!currentSelectedRecipe || !currentSelectedRecipe.products || currentSelectedRecipe.products.length === 0) {
    currentSelectedRecipe = null;
    renderMessageCard("Dieses Rezept erzeugt keine direkten Produkte.");
    setTotals(0, 0);
    return;
  }

  // Setze Default-Zielrate auf Basisoutput (wie bisher in deiner App)
  const primaryProduct = currentSelectedRecipe.products[0];
  const baseRate = (60 / currentSelectedRecipe.duration) * primaryProduct.amount;
  targetInput.value = baseRate.toFixed(1);

  updateCalculationUI();
}

function setTotals(machines, powerMw) {
  const machinesEl = document.getElementById("total-machines");
  const powerEl = document.getElementById("total-power");

  if (machinesEl) machinesEl.textContent = `${machines.toFixed(2)}x`;
  if (powerEl) powerEl.textContent = `~${powerMw.toFixed(0)} MW`;
}

function renderMessageCard(message) {
  const container = document.getElementById("recipe-tree");
  if (!container) return;

  container.innerHTML = `
    <div class="max-w-2xl mx-auto">
      <div class="bg-[#1a2027] border border-[#333d47] rounded-xl p-4 shadow">
        <div class="text-sm text-slate-200">${message}</div>
      </div>
    </div>
  `;
}

function renderTreeNodeAsTailwindCards(node, isRoot = false) {
  if (node.isRaw) {
    return `
      <div class="bg-[#1a2027] border border-rose-500/40 rounded-xl p-3.5 flex items-center justify-between shadow">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 text-rose-400 bg-rose-950/30 border border-rose-800 rounded-lg flex items-center justify-center font-bold text-xs shadow-inner">
            RAW
          </div>
          <div>
            <div class="font-semibold text-sm text-slate-200">${node.name}</div>
            <div class="text-xs text-slate-400">Rohstoff</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-sm font-bold text-slate-100">${node.requiredRate.toFixed(1)} <span class="text-xs text-slate-400">/min</span></div>
        </div>
      </div>
    `;
  }

  if (isRoot) {
    return `
      <div class="bg-[#1a2027] border-2 border-[#fa9549] rounded-xl p-4 shadow-lg mb-4">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-[#232a33] border border-[#fa9549] rounded-lg flex items-center justify-center font-bold text-[#fa9549] text-sm shadow-inner">
              OUT
            </div>
            <div>
              <h2 class="font-bold text-base text-slate-100">${node.recipeName}</h2>
              <p class="text-xs text-[#fa9549]">${node.machineName}</p>
            </div>
          </div>
          <div class="text-right">
            <span class="text-lg font-extrabold text-[#fa9549]">${node.targetRate.toFixed(1)} /min</span>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="bg-[#1a2027] border border-[#333d47] rounded-xl p-3.5 flex items-center justify-between shadow transition active:scale-[0.99]">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 text-[#fa9549] bg-[#232a33] border border-[#333d47] rounded-lg flex items-center justify-center font-bold text-xs shadow-inner">
          ${node.machinesNeeded.toFixed(2)}x
        </div>
        <div>
          <div class="font-semibold text-sm text-slate-200">${node.recipeName}</div>
          <div class="text-xs text-slate-400">${node.machineName}</div>
        </div>
      </div>
      <div class="text-right">
        <div class="text-sm font-bold text-slate-100">${node.targetRate.toFixed(1)} <span class="text-xs text-slate-400">/min</span></div>
      </div>
    </div>
  `;
}

function renderProductionTree(tree) {
  const container = document.getElementById("recipe-tree");
  if (!container) return;

  let html = "";
  html += renderTreeNodeAsTailwindCards(tree, true);
  html += `<div class="text-xs uppercase text-slate-400 font-bold tracking-wider mb-2 px-1">Benötigte Maschinen & Zwischenprodukte:</div>`;

  // flache Liste: wir laufen rekursiv über alle children außer root und rendern sie nacheinander
  function walk(node) {
    if (!node || !node.ingredients) return;
    for (const child of node.ingredients) {
      html += renderTreeNodeAsTailwindCards(child, false);
      walk(child);
    }
  }

  walk(tree);
  container.innerHTML = html;
}

function updateCalculationUI() {
  if (!currentSelectedRecipe) return;

  const targetRate = parseFloat(document.getElementById("target-rate").value) || 0;
  const productionTree = calculateProductionTree(currentSelectedRecipe, targetRate, availableRecipes);

  const totals = aggregateTotals(productionTree);
  setTotals(totals.machines, totals.power);

  renderProductionTree(productionTree);
}

function resetUIToEmptyState() {
  renderMessageCard("Bitte wähle oben ein Rezept aus.");
  setTotals(0, 0);
}

async function initApp() {
  setTestStatusRunning();

  const selectElement = document.getElementById("product-select");
  const targetInput = document.getElementById("target-rate");

  const isTestPassed = runAllTests();
  if (!isTestPassed) {
    setTestStatusFail();
    renderMessageCard("Logik-Tests fehlgeschlagen. Siehe Konsole.");
    return;
  }
  setTestStatusOk();

  if (!selectElement || !targetInput) {
    renderMessageCard("UI-Fehler: Erwartete Elemente wurden nicht gefunden (IDs).");
    return;
  }

  try {
    // Falls DocsRecipes.json in einem Unterordner liegt, passe den Pfad hier an.
    const response = await fetch("DocsRecipes.json");
    if (!response.ok) throw new Error("Netzwerk-Antwort war nicht ok");

    const rawJsonData = await response.json();
    availableRecipes = extractAndSortRecipes(rawJsonData);

    populateSelectDropdown(selectElement, availableRecipes);

    selectElement.addEventListener("change", handleRecipeSelection);
    targetInput.addEventListener("input", updateCalculationUI);

    resetUIToEmptyState();
  } catch (error) {
    console.error("Fehler beim Laden:", error);
    setTestStatusFail();
    renderMessageCard("Fehler beim Laden der DocsRecipes.json.");
  }
}

document.addEventListener("DOMContentLoaded", initApp);
