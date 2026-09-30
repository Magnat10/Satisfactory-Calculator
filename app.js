import {
    normalize,
    products,
    category,
    solve,
    test
} from './calculator.js';


let recipes = [];
let catalog = [];

let plan = null;

let currentView = 'network';


/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

const $ =
    selector =>
        document.querySelector(selector);


/*
 * HTML Escaping für dynamische Inhalte.
 */
function escapeHtml(value) {
    return String(value)
        .replace(
            /[&<>"']/g,
            character => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            })[character]
        );
}


/*
 * =========================================================
 * INITIALISIERUNG
 * =========================================================
 */

async function init() {

    /*
     * Engine-Test anzeigen.
     */
    $('#test').textContent =
        test()
            ? 'TESTS: OK ✓'
            : 'TESTS: FEHLER ✗';


    try {

        /*
         * Bestehende Satisfactory-Datenbank laden.
         */
        const response =
            await fetch(
                'DocsRecipes.json'
            );


        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }


        const rawData =
            await response.json();


        /*
         * Nur für den Planner relevante
         * Produktionsrezepte übernehmen.
         */
        recipes =
            normalize(rawData);


        /*
         * Liste produzierbarer Items aufbauen.
         */
        catalog =
            products(recipes);


        fillProductSelect();

        registerEvents();


        /*
         * Reinforced Iron Plate als
         * Beispiel-Startprodukt verwenden,
         * sofern vorhanden.
         */
        const reinforcedIronPlate =
            catalog.find(
                product =>
                    product.id ===
                    'Desc_IronPlateReinforced_C'
            );


        if (reinforcedIronPlate) {

            $('#product').value =
                reinforcedIronPlate.id;


            $('#rate').value =
                20;


            calculate();
        }

    } catch (error) {

        $('#view').innerHTML = `
            <div class="empty">

                DocsRecipes.json konnte
                nicht geladen werden.

                <br>

                ${escapeHtml(error.message)}

            </div>
        `;
    }
}


/*
 * =========================================================
 * PRODUKTAUSWAHL
 * =========================================================
 */

function fillProductSelect() {

    const groups = {};


    /*
     * Produkte nach Kategorie gruppieren.
     */
    catalog.forEach(
        product => {

            const group =
                category(
                    product.name
                );


            if (!groups[group]) {
                groups[group] = [];
            }


            groups[group].push(
                product
            );
        }
    );


    let html = `
        <option value="">
            Produkt wählen…
        </option>
    `;


    /*
     * Kategorien erzeugen.
     */
    const sortedGroups =
        Object
            .entries(groups)
            .sort(
                ([a], [b]) =>
                    a.localeCompare(b)
            );


    for (
        const [groupName, groupProducts]
        of sortedGroups
    ) {

        html += `
            <optgroup
                label="${escapeHtml(groupName)}"
            >
        `;


        for (
            const product
            of groupProducts
        ) {

            html += `
                <option
                    value="${escapeHtml(product.id)}"
                >
                    ${escapeHtml(product.name)}
                </option>
            `;
        }


        html += `
            </optgroup>
        `;
    }


    $('#product').innerHTML =
        html;
}


/*
 * =========================================================
 * EVENTS
 * =========================================================
 */

function registerEvents() {

    [
        'product',
        'rate',
        'belt'
    ].forEach(
        id => {

            $(`#${id}`)
                .addEventListener(
                    'change',
                    calculate
                );
        }
    );


    /*
     * Zielrate live berechnen.
     */
    $('#rate')
        .addEventListener(
            'input',
            calculate
        );


    /*
     * Ansichten umschalten.
     */
    document
        .querySelectorAll(
            'nav button'
        )
        .forEach(
            button => {

                button.onclick = () => {

                    currentView =
                        button.dataset.view;


                    document
                        .querySelectorAll(
                            'nav button'
                        )
                        .forEach(
                            navigationButton => {

                                navigationButton
                                    .classList
                                    .toggle(
                                        'active',
                                        navigationButton
                                        ===
                                        button
                                    );
                            }
                        );


                    render();
                };
            }
        );
}


/*
 * =========================================================
 * PRODUKTIONSPLAN BERECHNEN
 * =========================================================
 */

function calculate() {

    const itemId =
        $('#product').value;


    const rate =
        Number(
            $('#rate').value
        );


    /*
     * Keine gültige Auswahl.
     */
    if (
        !itemId
        ||
        !rate
        ||
        rate <= 0
    ) {

        plan = null;

        resetFooter();

        render();

        return;
    }


    /*
     * FactoryPlan erzeugen.
     */
    plan =
        solve(
            itemId,
            rate,
            recipes,
            {
                maxBelt:
                    $('#belt').value
            }
        );


    /*
     * Footer aktualisieren.
     */
    $('#machines').textContent =
        plan
            .totals
            .machineCount
            .toFixed(2)
        +
        'x';


    $('#power').textContent =
        plan
            .totals
            .power
            .toFixed(1)
        +
        ' MW';


    const rawResourceRate =
        Object
            .values(
                plan.totals.raw
            )
            .reduce(
                (sum, value) =>
                    sum + value,
                0
            );


    $('#raw').textContent =
        rawResourceRate
            .toFixed(1);


    render();
}


/*
 * =========================================================
 * FOOTER RESET
 * =========================================================
 */

function resetFooter() {

    $('#machines').textContent =
        '0x';

    $('#power').textContent =
        '0 MW';

    $('#raw').textContent =
        '0';
}


/*
 * =========================================================
 * ICON PLACEHOLDER
 * =========================================================
 */

function icon(type = 'ITEM') {

    return `
        <div class="icon">
            ${escapeHtml(type)}
        </div>
    `;
}


/*
 * =========================================================
 * HAUPTRENDERER
 * =========================================================
 */

function render() {

    if (!plan) {

        $('#view').innerHTML = `
            <div class="empty">
                Produkt und Zielrate auswählen.
            </div>
        `;

        return;
    }


    const views = {
        network:
            renderNetwork,

        tree:
            renderTree,

        items:
            renderItems,

        machines:
            renderMachines
    };


    const renderer =
        views[currentView]
        ||
        renderNetwork;


    renderer();
}


/*
 * =========================================================
 * GEGENSTÄNDE
 * =========================================================
 */

function renderItems() {

    const rawResources =
        plan.totals.raw;


    const entries =
        Object
            .entries(
                plan.totals.items
            )
            .sort(
                (a, b) =>
                    a[1] - b[1]
            );


    $('#view').innerHTML = `
        <div class="panel list">

            ${entries.map(
                ([itemId, rate]) => {

                    const isRaw =
                        Boolean(
                            rawResources[itemId]
                        );


                    return `
                        <div
                            class="
                                row
                                ${isRaw ? 'raw' : ''}
                            "
                        >

                            ${
                                icon(
                                    isRaw
                                        ? 'ORE'
                                        : 'ITEM'
                                )
                            }


                            <div>

                                <div class="name">
                                    ${
                                        escapeHtml(
                                            getItemName(
                                                itemId
                                            )
                                        )
                                    }
                                </div>

                                <div class="sub">

                                    ${
                                        isRaw
                                            ? 'Rohstoff'
                                            : 'Materialfluss'
                                    }

                                </div>

                            </div>


                            <div class="value">

                                ${rate.toFixed(1)}

                                /min

                            </div>

                        </div>
                    `;
                }
            ).join('')}

        </div>
    `;
}


/*
 * =========================================================
 * GEBÄUDE
 * =========================================================
 */

function renderMachines() {

    const machines =
        Object
            .values(
                plan.totals.machines
            )
            .sort(
                (a, b) =>
                    b.count
                    -
                    a.count
            );


    $('#view').innerHTML = `
        <div class="panel list">

            ${machines.map(
                machine => `
                    <div class="row">

                        ${icon('MK')}


                        <div>

                            <div class="name">
                                ${
                                    escapeHtml(
                                        machine.name
                                    )
                                }
                            </div>


                            <div class="sub">

                                ${
                                    escapeHtml(
                                        machine.family
                                    )
                                }

                                ·

                                ${
                                    machine.power
                                        .toFixed(1)
                                }

                                MW

                            </div>

                        </div>


                        <div class="value">

                            ${
                                machine.count
                                    .toFixed(2)
                            }x

                        </div>

                    </div>
                `
            ).join('')}

        </div>
    `;
}


/*
 * =========================================================
 * BAUMANSICHT
 * =========================================================
 */

function renderTree() {

    function renderNode(node) {

        /*
         * Rohstoff
         */
        if (node.type === 'raw') {

            return `
                <div class="tree-node">

                    <div class="tree-card">

                        <span>

                            ◈
                            ${
                                escapeHtml(
                                    node.name
                                )
                            }

                            <small class="sub">
                                Rohstoff
                            </small>

                        </span>


                        <b>
                            ${
                                node.rate
                                    .toFixed(1)
                            }/min
                        </b>

                    </div>

                </div>
            `;
        }


        /*
         * Produktionsmaschine
         */
        return `
            <div class="tree-node">

                <div class="tree-card">

                    <span>

                        ▣
                        ${
                            escapeHtml(
                                node.name
                            )
                        }


                        <div class="sub">

                            ${
                                node.count
                                    .toFixed(2)
                            }x

                            ${
                                escapeHtml(
                                    node.machine.name
                                )
                            }

                        </div>

                    </span>


                    <b>

                        ${
                            node.rate
                                .toFixed(1)
                        }/min

                    </b>

                </div>


                ${
                    node.children.length
                        ?
                        `
                            <div class="children">

                                ${
                                    node.children
                                        .map(
                                            renderNode
                                        )
                                        .join('')
                                }

                            </div>
                        `
                        :
                        ''
                }

            </div>
        `;
    }


    $('#view').innerHTML = `
        <div class="panel tree">

            ${
                renderNode(
                    plan.root
                )
            }

        </div>
    `;
}


/*
 * =========================================================
 * NETZWERKGRAPH
 * =========================================================
 */

function renderNetwork() {

    /*
     * Nodes nach Tiefe gruppieren.
     */
    const levels = {};


    plan.nodes.forEach(
        node => {

            if (!levels[node.depth]) {
                levels[node.depth] = [];
            }


            levels[node.depth]
                .push(node);
        }
    );


    const depths =
        Object
            .keys(levels)
            .map(Number);


    const maxDepth =
        Math.max(...depths);


    let html = `
        <div class="network">
    `;


    /*
     * Rohstoffe links,
     * Zielprodukt rechts.
     */
    for (
        let depth = maxDepth;
        depth >= 0;
        depth--
    ) {

        const nodes =
            levels[depth] || [];


        html += `
            <div class="net-col">

                ${nodes.map(
                    node => {

                        const machineInfo =
                            node.type ===
                            'production'
                                ?
                                `
                                    ${
                                        node.count
                                            .toFixed(2)
                                    }x

                                    ${
                                        escapeHtml(
                                            node.machine.name
                                        )
                                    }

                                    ·
                                `
                                :
                                '';


                        return `
                            <div class="net-node">

                                <div class="net-icon">

                                    ${
                                        node.type
                                        ===
                                        'raw'
                                            ?
                                            'ORE'
                                            :
                                            'MK'
                                    }

                                </div>


                                <div class="net-name">

                                    ${
                                        escapeHtml(
                                            node.name
                                        )
                                    }

                                </div>


                                <div class="net-rate">

                                    ${machineInfo}

                                    ${
                                        node.rate
                                            .toFixed(1)
                                    }/min

                                </div>

                            </div>
                        `;
                    }
                ).join('')}

            </div>
        `;


        /*
         * Flow zwischen den Ebenen.
         */
        if (depth > 0) {

            const depthEdges =
                plan.edges.filter(
                    edge => {

                        const sourceNode =
                            plan.nodes.find(
                                node =>
                                    node.id
                                    ===
                                    edge.from
                            );


                        return (
                            sourceNode
                                ?.depth
                            ===
                            depth
                        );
                    }
                );


            const hasBottleneck =
                depthEdges.some(
                    edge =>
                        edge.bottleneck
                );


            const firstEdge =
                depthEdges[0];


            const text =
                firstEdge
                    ?
                    `
                        Mk.${firstEdge.beltMk}
                        ·
                        ${
                            firstEdge.rate
                                .toFixed(1)
                        }/min
                    `
                    :
                    '';


            html += `
                <div
                    class="
                        flow
                        ${
                            hasBottleneck
                                ? 'bad'
                                : ''
                        }
                    "
                >

                    <span>
                        ${text}
                    </span>

                </div>
            `;
        }
    }


    html += `
        </div>
    `;


    /*
     * Bottleneck-Warnungen.
     */
    if (plan.warnings.length) {

        html += `
            <div
                class="empty"
                style="
                    margin-top: 8px;
                    color: #fb7185;
                "
            >

                ⚠

                ${
                    plan.warnings
                        .map(
                            escapeHtml
                        )
                        .join('<br>')
                }

            </div>
        `;
    }


    $('#view').innerHTML =
        html;
}


/*
 * =========================================================
 * ITEM-NAME AUFLÖSEN
 * =========================================================
 */

function getItemName(itemId) {

    const catalogItem =
        catalog.find(
            item =>
                item.id === itemId
        );


    if (catalogItem) {
        return catalogItem.name;
    }


    /*
     * Fallback für Rohstoffe,
     * die selbst kein Produktionsrezept besitzen.
     */
    return itemId
        .replace(
            /^Desc_/,
            ''
        )
        .replace(
            /_C$/,
            ''
        )
        .replace(
            /([a-z])([A-Z])/g,
            '$1 $2'
        );
}


/*
 * =========================================================
 * START
 * =========================================================
 */

init();
