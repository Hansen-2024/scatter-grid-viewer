let GROUPS = {};
let DATA_CACHE = {};
let CURRENT_GROUP = null;
let CURRENT_PAGE = 0;
let COLOR_MODE = false;
let SHOW_COLOR = false;
let SEED_FILTER = null;
let CURRENT_VIEW = "home";
let SELECTED_CELL = null;

const PLOTS_PER_PAGE = 8;

function parseSeed(file) {
    const m = file.match(/s(\d+)p(\d+)/);
    if (!m) return null;

    return {
        s: Number(m[1]),
        p: Number(m[2])
    };
}

init();

window.onpopstate = function(event){
    if(!event.state){
        buildSeedChooser();
        return;
    }

    if(event.state.view==="s1p"){
        SEED_FILTER="s1p?";
        buildKCGrid();
        return;
    }

    if(event.state.view==="sp1"){
        SEED_FILTER="s?p1";
        buildKCGrid();
        return;
    }

    buildSeedChooser();
};

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
    buildSeedChooser();

    document.getElementById("normalBtn").onclick = function () {
        COLOR_MODE = false;
        if (CURRENT_VIEW === "plots" && CURRENT_GROUP) {
            showGroup(CURRENT_GROUP, CURRENT_PAGE);
        }
    };

    document.getElementById("colorBtn").onclick = function () {
        COLOR_MODE = true;
        if (CURRENT_VIEW === "plots" && CURRENT_GROUP) {
            showGroup(CURRENT_GROUP, CURRENT_PAGE);
        }
    };
}

// =============================
function clearUI() {
    const grid = document.getElementById("grid");
    const plots = document.getElementById("plots");

    Plotly.purge(plots);

    grid.innerHTML = "";
    plots.innerHTML = "";
}

// =============================
function buildFileMap(files) {

    GROUPS = {};

    files.forEach(file => {

        let kMatch = file.match(/K([0-9.]+)/);
        let cMatch = file.match(/C([0-9.]+)/);

        let K = kMatch ? Math.abs(parseFloat(kMatch[1])) : NaN;
        let C = cMatch ? parseFloat(cMatch[1]) : NaN;

        if (isNaN(K) || isNaN(C)) return;

        let groupKey = `K=${K}_C=${C}`;

        if (!GROUPS[groupKey]) GROUPS[groupKey] = [];

        GROUPS[groupKey].push(file);
    });
}

// =============================
function buildSeedChooser(){
    clearUI();
    CURRENT_VIEW = "home";

    document.getElementById("plotsTitle").style.display = "none";
    document.getElementById("plots").style.display = "none";
    document.getElementById("grid").style.display = "block";

    const grid = document.getElementById("grid");

    grid.innerHTML = `
        <div id="s1pBtn" style="width:200px;height:80px;border:1px solid black;display:flex;align-items:center;justify-content:center;cursor:pointer;margin:10px;">
            s1p?
        </div>

        <div id="sp1Btn" style="width:200px;height:80px;border:1px solid black;display:flex;align-items:center;justify-content:center;cursor:pointer;margin:10px;">
            s?p1
        </div>
    `;

    document.getElementById("s1pBtn").onclick=()=>{
        SEED_FILTER="s1p?";
        CURRENT_VIEW="s1p";
        buildKCGrid();
    };

    document.getElementById("sp1Btn").onclick=()=>{
        SEED_FILTER="s?p1";
        CURRENT_VIEW="sp1";
        buildKCGrid();
    };
}

// =============================
// GRID
// =============================
function buildKCGrid() {
    CURRENT_GROUP = null;
    CURRENT_PAGE = 0;
    CURRENT_VIEW = "grid";

    const grid = document.getElementById("grid");
    grid.innerHTML = "";

    document.getElementById("plots").style.display = "none";
    document.getElementById("grid").style.display = "grid";

    let Kvalues = [];
    let Cvalues = [];
    let filteredGroups = {};

    Object.keys(GROUPS).forEach(group => {

        let files = GROUPS[group].filter(file => {
            if (!SEED_FILTER) return true;

            if (SEED_FILTER.startsWith("s1p")) {
                const seed = parseSeed(file);
                return seed && seed.s === 1;
            }

            if (SEED_FILTER.startsWith("s?p1")) {
                const seed = parseSeed(file);
                return seed && seed.p === 1;
            }

            return true;
        });

        if (files.length) filteredGroups[group] = files;
    });

    Object.keys(filteredGroups).forEach(group => {
        let [k,c] = group.split("_");
        Kvalues.push(parseFloat(k.split("=")[1]));
        Cvalues.push(parseFloat(c.split("=")[1]));
    });

    Kvalues = [...new Set(Kvalues)].sort((a,b)=>a-b);
    Cvalues = [...new Set(Cvalues)].sort((a,b)=>a-b);

    grid.style.gridTemplateColumns = `50px 60px repeat(${Kvalues.length},120px)`;

    // (rest of your grid code unchanged in spirit)
}

// =============================
async function loadAndPlot(file, div) {

    if (DATA_CACHE[file]) {
        drawPlot(DATA_CACHE[file], div, file);
        return;
    }

    const d = await fetch(`split_data/${file}`).then(r => r.json());

    DATA_CACHE[file] = d;
    drawPlot(d, div, file);
}

// =============================
function drawPlot(d, div, file) {

    Plotly.newPlot(div, [{
        x: d.x,
        y: d.y,
        mode: "markers",
        type: "scattergl",
        marker: { size: 2, color: "#0000dd" }
    }]);
}