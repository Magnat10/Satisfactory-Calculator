const POWER = {
    Constructor: 4,
    Smelter: 4,
    Assembler: 15,
    Manufacturer: 55,
    Refinery: 30,
    Foundry: 16,
    Packager: 10,
    Blender: 75,
    Converter: 250,
    QuantumEncoder: 2000
};


/*
 * Förderband-Kapazitäten
 * Items pro Minute
 */
export const BELTS = {
    1: 60,
    2: 120,
    3: 270,
    4: 480,
    5: 780,
    6: 1200
};


/*
 * Interne Satisfactory-Namen lesbarer machen.
 */
export function clean(raw = '') {
    return raw
        .replace(/^Desc_/, '')
        .replace(/^Build_/, '')
        .replace(/^BP_EquipmentDescriptor/, '')
        .replace(/Mk1/g, ' Mk.1')
        .replace(/Mk2/g, ' Mk.2')
        .replace(/Mk3/g, ' Mk.3')
        .replace(/_C$/, '')
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .trim();
}


/*
 * DocsRecipes.json normalisieren.
 *
 * Nicht für den Production Planner geeignete Rezepte
 * werden herausgefiltert.
 */
export function normalize(raw) {
    const recipes = [];

    for (const [key, value] of Object.entries(raw)) {
        const recipe =
            Array.isArray(value)
                ? value[0]
                : value;

        if (!recipe?.products?.length) {
            continue;
        }

        if (!recipe.duration || recipe.duration <= 0) {
            continue;
        }

        if (recipe.inBuildGun) {
            continue;
        }

        if (recipe.inCustomizer) {
            continue;
        }

        if (recipe.inWorkshop) {
            continue;
        }

        if (!recipe.producedIn?.length) {
            continue;
        }

        recipes.push({
            ...recipe,
            id: recipe.className || key
        });
    }

    return recipes;
}


/*
 * Aus allen Rezepten eine Liste produzierbarer
 * Items aufbauen.
 */
export function products(recipes) {
    const map = new Map();

    for (const recipe of recipes) {
        for (const product of recipe.products) {
            if (!map.has(product.item)) {
                map.set(product.item, {
                    id: product.item,
                    name: clean(product.item),
                    recipes: []
                });
            }
        }
    }

    for (const recipe of recipes) {
        for (const product of recipe.products) {
            map
                .get(product.item)
                ?.recipes.push(recipe);
        }
    }

    return [...map.values()]
        .sort(
            (a, b) =>
                a.name.localeCompare(b.name)
        );
}


/*
 * Temporäre automatische Gruppierung.
 *
 * Diese Funktion kann später durch categories.json
 * ersetzt werden.
 */
export function category(name) {
    if (
        /ore|coal|sulfur|bauxite|sam|quartz|limestone/i
            .test(name)
    ) {
        return 'Rohstoffe';
    }

    if (/ingot/i.test(name)) {
        return 'Barren';
    }

    if (
        /water|oil|fuel|residue|solution|acid|nitrogen/i
            .test(name)
    ) {
        return 'Fluids';
    }

    if (
        /wire|cable|circuit|computer|limiter|quickwire/i
            .test(name)
    ) {
        return 'Elektronik';
    }

    if (
        /plating|framework|wiring|assembly|director|propulsion|control unit/i
            .test(name)
    ) {
        return 'Space Elevator';
    }

    if (
        /uranium|plutonium|nuclear|ficsonium/i
            .test(name)
    ) {
        return 'Nuklear';
    }

    return 'Bauteile';
}


/*
 * Maschinen-ID in verwendbare Maschineninformationen
 * umwandeln.
 *
 * Später wird dies durch machines.json ersetzt.
 */
function machineInfo(id) {
    const name = clean(id);

    const family =
        Object.keys(POWER)
            .find(
                machineName =>
                    name.includes(machineName)
            ) || name;

    return {
        id,
        name,
        family,

        power:
            POWER[family] || 0
    };
}


/*
 * =========================================================
 * FACTORY SOLVER
 * =========================================================
 *
 * Erzeugt aus:
 *
 *      Produkt
 *      Zielrate
 *      Rezepte
 *      Einstellungen
 *
 * einen FactoryPlan.
 */
export function solve(
    itemId,
    rate,
    recipes,
    settings = {}
) {
    /*
     * Produkt -> mögliche Rezepte
     */
    const byProduct = new Map();


    for (const recipe of recipes) {
        for (const product of recipe.products) {
            if (!byProduct.has(product.item)) {
                byProduct.set(
                    product.item,
                    []
                );
            }

            byProduct
                .get(product.item)
                .push(recipe);
        }
    }


    const nodes = [];
    const edges = [];
    const warnings = [];

    const seen = new Set();

    let sequence = 0;


    /*
     * -----------------------------------------------------
     * PRODUKTIONSBAUM REKURSIV AUFBAUEN
     * -----------------------------------------------------
     */
    function walk(
        item,
        requiredRate,
        parent = null,
        depth = 0
    ) {
        const recipeChoices =
            byProduct.get(item) || [];


        /*
         * Standardrezept bevorzugen.
         *
         * Alternate-Auswahl kommt später als
         * Benutzereinstellung hinzu.
         */
        const recipe =
            recipeChoices.find(
                recipe =>
                    !recipe.alternate
            )
            ||
            recipeChoices[0];


        /*
         * Kein Rezept vorhanden:
         *
         * Das Item wird aktuell als Rohstoff bzw.
         * Endpunkt der Berechnung behandelt.
         */
        if (
            !recipe ||
            seen.has(item)
        ) {
            const id =
                `raw_${sequence++}`;


            const node = {
                id,

                type: 'raw',

                itemId: item,

                name:
                    clean(item),

                rate:
                    requiredRate,

                depth
            };


            nodes.push(node);


            if (parent) {
                createEdge(
                    node.id,
                    parent,
                    item,
                    requiredRate
                );
            }


            return node;
        }


        seen.add(item);


        /*
         * Gewünschtes Produkt innerhalb des Rezeptes
         * auswählen.
         */
        const output =
            recipe.products.find(
                product =>
                    product.item === item
            );


        const outputPerMinute =
            (60 / recipe.duration)
            *
            output.amount;


        const machineCount =
            requiredRate
            /
            outputPerMinute;


        const machine =
            machineInfo(
                recipe.producedIn[0]
            );


        const id =
            `node_${sequence++}`;


        const node = {
            id,

            type: 'production',

            itemId: item,

            name:
                clean(item),

            recipeId:
                recipe.id,

            recipeName:
                recipe.name,

            machine,

            count:
                machineCount,

            rate:
                requiredRate,

            depth,

            children: []
        };


        nodes.push(node);


        /*
         * Verbindung zum übergeordneten
         * Produktionsschritt.
         */
        if (parent) {
            createEdge(
                id,
                parent,
                item,
                requiredRate
            );
        }


        /*
         * Zutaten berechnen.
         */
        for (
            const ingredient
            of recipe.ingredients || []
        ) {
            const baseIngredientRate =
                (60 / recipe.duration)
                *
                ingredient.amount;


            const requiredIngredientRate =
                baseIngredientRate
                *
                machineCount;


            const child =
                walk(
                    ingredient.item,
                    requiredIngredientRate,
                    id,
                    depth + 1
                );


            node.children.push(child);
        }


        seen.delete(item);


        return node;
    }


    /*
     * -----------------------------------------------------
     * TRANSPORTVERBINDUNG
     * -----------------------------------------------------
     */
    function createEdge(
        from,
        to,
        item,
        flow
    ) {
        const maxBelt =
            settings.maxBelt === 'auto'
                ? 6
                : Number(
                    settings.maxBelt || 6
                );


        /*
         * Kleinsten ausreichenden Belt suchen.
         */
        const beltTier =
            Object
                .keys(BELTS)
                .map(Number)
                .find(
                    mk =>
                        mk <= maxBelt &&
                        BELTS[mk] >= flow
                )
            ||
            maxBelt;


        const capacity =
            BELTS[beltTier];


        /*
         * Anzahl paralleler Belt-Linien.
         */
        const lines =
            Math.ceil(
                flow / capacity
            );


        /*
         * Bei fest gesetztem Belt prüfen,
         * ob eine einzelne Leitung überlastet ist.
         */
        const bottleneck =
            settings.maxBelt !== 'auto'
            &&
            flow > capacity;


        const edge = {
            id:
                `edge_${sequence++}`,

            from,

            to,

            itemId:
                item,

            rate:
                flow,

            beltMk:
                beltTier,

            capacity,

            lines,

            bottleneck
        };


        edges.push(edge);


        if (bottleneck) {
            warnings.push(
                `Belt Mk.${beltTier}: `
                +
                `${flow.toFixed(1)}/min > `
                +
                `${capacity}/min`
            );
        }
    }


    /*
     * Root-Produkt berechnen.
     */
    const root =
        walk(
            itemId,
            rate
        );


    /*
     * =====================================================
     * AGGREGATION
     * =====================================================
     */

    const itemTotals = {};
    const machineTotals = {};
    const rawTotals = {};

    let totalPower = 0;
    let totalMachines = 0;


    for (const node of nodes) {

        /*
         * Items aggregieren.
         */
        itemTotals[node.itemId] =
            (
                itemTotals[node.itemId]
                || 0
            )
            +
            node.rate;


        /*
         * Rohstoffe.
         */
        if (node.type === 'raw') {
            rawTotals[node.itemId] =
                (
                    rawTotals[node.itemId]
                    || 0
                )
                +
                node.rate;

            continue;
        }


        /*
         * Maschinen.
         */
        totalMachines +=
            node.count;


        /*
         * Strom.
         */
        totalPower +=
            node.count
            *
            node.machine.power;


        /*
         * Gleiche Maschinen aggregieren.
         */
        const machineKey =
            node.machine.id;


        if (!machineTotals[machineKey]) {
            machineTotals[machineKey] = {
                ...node.machine,

                count: 0,
                power: 0
            };
        }


        machineTotals[machineKey].count +=
            node.count;


        machineTotals[machineKey].power +=
            node.count
            *
            node.machine.power;
    }


    /*
     * =====================================================
     * FACTORY PLAN
     * =====================================================
     */

    return {
        target: {
            itemId,
            ratePerMinute: rate
        },

        root,

        nodes,

        edges,

        warnings,

        totals: {
            items:
                itemTotals,

            machines:
                machineTotals,

            raw:
                rawTotals,

            machineCount:
                totalMachines,

            power:
                totalPower
        }
    };
}


/*
 * =========================================================
 * TESTS
 * =========================================================
 */

export function test() {
    const beltTest =
        BELTS[1] === 60;

    const productionRateTest =
        Math.abs(
            ((60 / 6) * 2)
            -
            20
        ) < 1e-9;


    return (
        beltTest
        &&
        productionRateTest
    );
}
