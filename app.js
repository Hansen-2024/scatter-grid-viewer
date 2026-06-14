let GROUPS = {};
let DATA_CACHE = {};

init();

// =============================
// INIT
// =============================
async function init() {

    const manifest = await fetch("split_data/manifest.json")
        .then(r => r.json())
        .catch(err => {
            console.error("Missing split_data/manifest.json", err);
            return [];
        });

    buildFileMap(manifest);
    buildMainGrid();
}

// =============================
// BUILD GROUPS FROM FILES
// =============================
function buildFileMap(files) {

    GROUPS = {};

    files.forEach(file => {

        let kMatch = file.match(/K([0-9.]+)/);
        let cMatch = file.match(/C([0-9.]+)/);

        let K = kMatch ? kMatch[1] : "unknown";
        let C = cMatch ? cMatch[1] : "unknown";

        let groupKey = `K=${K}_C=${C}`;

        if (!GROUPS[groupKey]) {
            GROUPS[groupKey] = [];
        }

        GROUPS[groupKey].push(file);
    });
}

// =============================
// BUILD GRID UI
// =============================
function buildMainGrid() {

    const grid = document.getElementById("grid");
    const plots = document.getElementById("plots");

    grid.innerHTML = "";
    plots.innerHTML = "";

    let Kvalues = [...new Set(Object.keys(GROUPS).map(k => k.split("_")[0].split("=")[1]))];
    let Cvalues = [...new Set(Object.keys(GROUPS).map(k => k.split("_")[1].split("=")[1]))];

    Kvalues.sort((a, b) => a - b);
    Cvalues.sort((a, b) => a - b);

    grid.style.display = "grid";
    grid.style.gridTemplateColumns = `repeat(${Kvalues.length}, 1fr)`;
    grid.style.gap = "10px";

    Cvalues.forEach(C => {
        Kvalues.forEach(K => {

            let groupKey = `K=${K}_C=${C}`;
            if (!GROUPS[groupKey]) return;

            let cell = document.createElement("div");
            cell.className = "cell";

            cell.innerHTML = `
                <div>K/w0 = ${Math.round(Math.abs(K / 8.0666))}</div>
                <div>C = ${C}</div>
                <div style="font-size:12px;color:gray">
                    ${GROUPS[groupKey].length} plots
                </div>
            `;

            cell.onclick = () => showGroup(groupKey);

            grid.appendChild(cell);
        });
    });
}

// =============================
// SHOW 2x2 PLOTS
// =============================
function showGroup(groupName) {

    const plots = document.getElementById("plots");
    plots.innerHTML = "";

    let files = GROUPS[groupName].slice(0, 4);

    let container = document.createElement("div");
    container.style.display = "grid";
    container.style.gridTemplateColumns = "1fr 1fr";
    container.style.gap = "5px";
    container.style.width = "100%";

    plots.appendChild(container);

    files.forEach(file => {

        let div = document.createElement("div");
        div.style.height = "350px";
        div.style.width = "100%";

        container.appendChild(div);

        loadAndPlot(file, div);
    });
}

// =============================
// LAZY LOAD DATA FILE
// =============================
async function loadAndPlot(file, div) {

    if (DATA_CACHE[file]) {
        drawPlot(DATA_CACHE[file], div, file);
        return;
    }

    try {
        const d = await fetch(`split_data/${file}`).then(r => r.json());

        DATA_CACHE[file] = d;

        drawPlot(d, div, file);

    } catch (err) {
        console.error("Failed loading file:", file, err);
    }
}

// =============================
// PLOT FUNCTION
// =============================
function drawPlot(d, div, file) {

    let seedMatch = file.match(/s1p[1-4]/);
    let seed = seedMatch ? seedMatch[0] : "s?p?";

    const experimentTag = "LNm0.5s0.736L0.1H15.0";

    Plotly.newPlot(div, [{
        x: d.x,
        y: d.y,
        mode: "markers",
        type: "scattergl",
        marker: { size: 2 }
    }], {
        title: {
            text: `${seed}_${experimentTag}`,
            font: { size: 14 },
            x: 0.5
        },
        margin: { t: 30, l: 40, r: 10, b: 40 }
    });
}
