export function calculateItemsPerMinute(duration, amount) {
    if (duration <= 0) return 0;
    return (60 / duration) * amount;
}

export function calculateMachineCount(targetRate, baseRatePerMachine) {
    if (baseRatePerMachine <= 0) return 0;
    return targetRate / baseRatePerMachine;
}

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

export function cleanItemName(rawName) {
    if (!rawName) return "Unknown Item";
    return rawName
        .replace('Desc_', '')
        .replace('BP_EquipmentDescriptor', '')
        .replace('_C', '')
        .replace(/([A-Z])/g, ' $1')
        .trim();
}

export function findRecipeForProduct(recipes, productItemClass) {
    return recipes.find(r => r.products && r.products.some(p => p.item === productItemClass));
}

export function calculateProductionTree(recipe, targetRate, allRecipes) {
    const primaryProduct = recipe.products[0];
    const baseOutput = calculateItemsPerMinute(recipe.duration, primaryProduct.amount);
    const machinesNeeded = calculateMachineCount(targetRate, baseOutput);
    const machineName = recipe.producedIn && recipe.producedIn.length > 0 
                        ? cleanItemName(recipe.producedIn[0]) 
                        : "Manual Crafting";

    const node = {
        recipeName: recipe.name,
        machineName: machineName,
        machinesNeeded: machinesNeeded,
        targetRate: targetRate,
        ingredients: []
    };

    if (recipe.ingredients && recipe.ingredients.length > 0) {
        recipe.ingredients.forEach(ing => {
            const baseIngRate = calculateItemsPerMinute(recipe.duration, ing.amount);
            const requiredIngRate = baseIngRate * machinesNeeded;
            
            const subRecipe = findRecipeForProduct(allRecipes, ing.item);
            
            if (subRecipe) {
                node.ingredients.push(calculateProductionTree(subRecipe, requiredIngRate, allRecipes));
            } else {
                node.ingredients.push({
                    isRaw: true,
                    name: cleanItemName(ing.item),
                    requiredRate: requiredIngRate
                });
            }
        });
    }
    return node;
}

/**
 * Aggregiert Gesamtmaschinen und geschätzten Stromverbrauch aus dem Baum.
 */
export function aggregateTotals(node) {
    let totalMachines = node.isRaw ? 0 : node.machinesNeeded;
    let totalPower = node.isRaw ? 0 : (node.machinesNeeded * 15); // Pauschaler Richtwert

    if (node.ingredients && node.ingredients.length > 0) {
        node.ingredients.forEach(ing => {
            const subTotals = aggregateTotals(ing);
            totalMachines += subTotals.machines;
            totalPower += subTotals.power;
        });
    }

    return { machines: totalMachines, power: totalPower };
}

export function runAllTests() {
    let allPassed = true;
    const rate = calculateItemsPerMinute(6, 2);
    if (rate !== 20) {
        console.error(`[TEST FEHLGESCHLAGEN] Rate: Erwartet 20, Erhalten ${rate}`);
        allPassed = false;
    }
    if (allPassed) console.log("[TESTS ERFOLGREICH] Alle Logik-Tests bestanden.");
    return allPassed;
}
