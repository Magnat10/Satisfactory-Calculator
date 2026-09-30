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

/**
 * Sucht das erste Rezept, das ein bestimmtes Item produziert.
 */
export function findRecipeForProduct(recipes, productItemClass) {
    return recipes.find(r => r.products && r.products.some(p => p.item === productItemClass));
}

/**
 * Baut rekursiv den kompletten Produktionsbaum auf.
 */
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
                // Rekursion: Zutat hat ein Rezept -> tiefer in den Baum gehen
                node.ingredients.push(calculateProductionTree(subRecipe, requiredIngRate, allRecipes));
            } else {
                // Basis-Fall: Kein Rezept gefunden -> Es ist ein reiner Rohstoff
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
 * QUALITÄTSSICHERUNG / TESTFÄLLE
 */
export function runAllTests() {
    let allPassed = true;

    // Test 1-3 aus vorherigen Schritten übersprungen, Fokus auf Test 4
    // Test 4: Rekursiver Baumaufbau
    const mockRecipes = [
        { 
            name: "End Product", duration: 10, producedIn: ["Assembler"], 
            products: [{item: "Item_End", amount: 1}], 
            ingredients: [{item: "Item_Sub", amount: 2}] 
        },
        { 
            name: "Sub Product", duration: 5, producedIn: ["Constructor"], 
            products: [{item: "Item_Sub", amount: 1}], 
            ingredients: [{item: "Item_Raw", amount: 1}] 
        }
    ];
    
    // Ziel: 6 End Products / min. (Erfordert 12 Sub Products / min)
    const tree = calculateProductionTree(mockRecipes[0], 6, mockRecipes);
    
    if (tree.ingredients[0].targetRate !== 12) {
        console.error(`[TEST 4 FEHLGESCHLAGEN] Rekursion: Erwartet 12, Erhalten ${tree.ingredients[0].targetRate}`);
        allPassed = false;
    }
    if (!tree.ingredients[0].ingredients[0].isRaw) {
        console.error(`[TEST 4 FEHLGESCHLAGEN] Rohstoff-Erkennung fehlerhaft.`);
        allPassed = false;
    }

    if (allPassed) console.log("[TESTS ERFOLGREICH] Rekursions-Tests bestanden.");
    return allPassed;
}
