let GROUPS = {};
let DATA_CACHE = {};
let CURRENT_GROUP = null;
let CURRENT_PAGE = 0;

let COLOR_MODE = false;
let SEED_FILTER = null;
let CURRENT_VIEW = "home";
let SELECTED_CELL = null;

const PLOTS_PER_PAGE = 8;

// =============================
// INIT
// =============================
init();

window.onpopstate = function (event) {
    if (!event.state) {
        buildSeedChooser();
        return;
    }

    if (event.state.view === "s1p") {
        SEED_FILTER = "s1p?";
        buildKCGrid();
        return;
    }

    if (event.state.view === "sp1") {
        SEED_FILTER = "s?p1";
        buildKCGrid();
        return;
    }

    buildSeedChooser();
};
function setColorControls(show) {
    document.getElementById("topBar").style.display = show ? "block" : "none";
}
// =============================
async function init() {

    const manifest = await fetch("split_data/manifest.json")
        .then(r => r.json())
        .catch(err => {
            console.error("❌ Missing split_data/manifest.json", err);
            return [];
        });

    console.log("Loaded manifest:", manifest.length);

    if (!manifest.length) {
        alert("Dataset not loaded. Check split_data on GitHub.");
    }

    buildFileMap(manifest);
    buildSeedChooser();

    document.getElementById("normalBtn").onclick = () => {
        COLOR_MODE = false;
        if (CURRENT_GROUP) showGroup(CURRENT_GROUP, CURRENT_PAGE);
    };

    document.getElementById("colorBtn").onclick = () => {
        COLOR_MODE = true;
        if (CURRENT_GROUP) showGroup(CURRENT_GROUP, CURRENT_PAGE);
    };
}

// =============================
function clearUI() {
    const grid = document.getElementById("grid");
    const plots = document.getElementById("plots");

    if (window.Plotly && plots) Plotly.purge(plots);

    grid.innerHTML = "";
    plots.innerHTML = "";
}

// =============================
function parseSeed(file) {
    const m = file.match(/s(\d+)p(\d+)/);
    if (!m) return null;

    return { s: +m[1], p: +m[2] };
}

// =============================
function buildFileMap(files) {

    GROUPS = {};

    files.forEach(file => {

        let kMatch = file.match(/K([0-9.]+)/);
        let cMatch = file.match(/C([0-9.]+)/);

        if (!kMatch || !cMatch) return;

        let K = parseFloat(kMatch[1]);
        let C = parseFloat(cMatch[1]);

        let key = `K=${K}_C=${C}`;

        if (!GROUPS[key]) GROUPS[key] = [];
        GROUPS[key].push(file);
    });

    console.log("Groups:", Object.keys(GROUPS).length);
}
function showGroup(groupName, page = 0, customFiles = null) {

    setColorControls(true);   // 🔥 show only in plot mode

    CURRENT_GROUP = groupName;
    CURRENT_PAGE = page;

    document.getElementById("plots").style.display = "block";
}
// =============================
function buildSeedChooser() {

    clearUI();
    CURRENT_VIEW = "home";

    setColorControls(false);   // 🔥 hide buttons on home

    document.getElementById("plots").style.display = "none";
    document.getElementById("grid").style.display = "block";

    const grid = document.getElementById("grid");

    grid.innerHTML = `
        <div id="s1pBtn"
             style="width:200px;height:80px;border:1px solid black;
             display:flex;align-items:center;justify-content:center;
             cursor:pointer;margin:10px;">
            s1p?
        </div>

        <div id="sp1Btn"
             style="width:200px;height:80px;border:1px solid black;
             display:flex;align-items:center;justify-content:center;
             cursor:pointer;margin:10px;">
            s?p1
        </div>
    `;

    document.getElementById("s1pBtn").onclick = () => {
        SEED_FILTER = "s1p?";
        CURRENT_VIEW = "s1p";
        buildKCGrid();
    };

    document.getElementById("sp1Btn").onclick = () => {
        SEED_FILTER = "s?p1";
        CURRENT_VIEW = "sp1";
        buildKCGrid();
    };
}
// =============================
function buildKCGrid() {
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = `repeat(${Kvals.length}, 120px)`;
    grid.style.gap = "6px";
    console.log("GROUPS:", Object.keys(GROUPS).length);
    console.log("SEED_FILTER:", SEED_FILTER);
    console.log("buildKCGrid triggered");

    CURRENT_GROUP = null;
    CURRENT_PAGE = 0;
    CURRENT_VIEW = "grid";

    const grid = document.getElementById("grid");

    document.getElementById("grid").style.display = "grid";
    document.getElementById("plots").style.display = "none";

    grid.innerHTML = "";
    
    // ensure we actually have data
    if (Object.keys(filtered).length === 0) {
        grid.innerHTML = "No data found for this filter";
        return;
    }
    
    Kvals.forEach(K => {

    Cvals.forEach(C => {

        const key = `K=${K}_C=${C}`;

        let cell = document.createElement("div");

        cell.style.border = "1px solid black";
        cell.style.height = "80px";
        cell.style.display = "flex";
        cell.style.alignItems = "center";
        cell.style.justifyContent = "center";

        if (filtered[key]) {
            cell.innerHTML = filtered[key].length + " plots";
            cell.style.cursor = "pointer";

            cell.onclick = () => {
                showGroup(key, 0, filtered[key]);
            };

        } else {
            cell.innerHTML = "";
            cell.style.background = "#eee";
        }

        grid.appendChild(cell);
    });
});
// =============================
async function loadAndPlot(file, div) {

    if (DATA_CACHE[file]) {
        drawPlot(DATA_CACHE[file], div);
        return;
    }

    try {
        const d = await fetch(`split_data/${file}`).then(r => r.json());
        DATA_CACHE[file] = d;
        drawPlot(d, div);
    }
    catch (e) {
        console.error("Load failed:", file, e);
    }
}

// =============================
function drawPlot(d, div) {

    Plotly.newPlot(div, [{
        x: d.x,
        y: d.y,
        mode: "markers",
        type: "scattergl",
        marker: { size: 2, color: "#0000dd" }
    }], {
        margin: { t: 20, l: 30, r: 10, b: 30 }
    });
}
