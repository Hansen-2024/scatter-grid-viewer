let REGULAR_GROUPS = {};
let FAST_GROUPS = {};
let DATA_CACHE = {};
let CURRENT_FILES = null;
let DATASET_MODE = "regular";
let CURRENT_GROUP = null;
let CURRENT_PAGE = 0;
let COLOR_MODE = false;
let SHOW_COLOR = false;
let SEED_FILTER = null;
let CURRENT_VIEW = "home";
let SELECTED_CELL = null;

const PLOTS_PER_PAGE = 8;

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
        if (document.getElementById("plots").style.display === "block" && CURRENT_GROUP) {
            showGroup(CURRENT_GROUP, CURRENT_PAGE);
        }
    };

    document.getElementById("colorBtn").onclick = function () {
        COLOR_MODE = true;
        if (document.getElementById("plots").style.display === "block" && CURRENT_GROUP) {
            showGroup(CURRENT_GROUP, CURRENT_PAGE);
        }
    };
}

function clearUI() {
    const grid = document.getElementById("grid");
    const plots = document.getElementById("plots");
    Plotly.purge(plots);
    grid.innerHTML = "";
    plots.innerHTML = "";
}

// =============================
// BUILD GROUPS FROM FILES
// =============================
function buildFileMap(files) {

    REGULAR_GROUPS = {};
    FAST_GROUPS = {};

    files.forEach(file => {

        let kMatch = file.match(/K([0-9.]+)/);
        let cMatch = file.match(/C([0-9.]+)/);

        let K = kMatch ? Math.abs(parseFloat(kMatch[1])) : NaN;
        let C = cMatch ? parseFloat(cMatch[1]) : NaN;

        if (isNaN(K) || isNaN(C)) return;

        let groupKey = `K=${K}_C=${C}`;

        const target =
            file.includes("_FT(")
                ? FAST_GROUPS
                : REGULAR_GROUPS;

        if (!target[groupKey]) {
            target[groupKey] = [];
        }

        target[groupKey].push(file);
    });
}

function buildSeedChooser() {
    CURRENT_VIEW = "home";
    clearUI();
    const container = document.getElementById("gridContainer");
    container.style.display = "block";
    let oldPanel = document.getElementById("infoPanel");
    if (oldPanel) oldPanel.remove();
    
    document.getElementById("grid").parentNode.style.display = "block";
    document.getElementById("colorControls").style.display = "none";
    document.getElementById("plotsTitle").style.display = "none";
    document.getElementById("plots").style.display = "none";

    const grid = document.getElementById("grid");
    grid.style.display = "block";
    grid.innerHTML = "";

    grid.innerHTML = `
    
    <div id="regularBtn"
    style="
    width:300px;
    height:100px;
    border:2px solid black;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:28px;
    font-weight:bold;
    cursor:pointer;
    margin:20px auto;">
    Regular
    </div>
    
    <div id="fastBtn"
    style="
    width:300px;
    height:100px;
    border:2px solid black;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:28px;
    font-weight:bold;
    cursor:pointer;
    margin:20px auto;">
    Fast Individuals
    </div>
    `;
    document.getElementById("regularBtn").onclick = () => {
        DATASET_MODE = "regular";
        buildSeedTypeChooser();
    };
    
    document.getElementById("fastBtn").onclick = () => {
        DATASET_MODE = "fast";
        buildSeedTypeChooser();
    };
}
function buildSeedTypeChooser() {
    const container = document.getElementById("gridContainer");
    container.style.display = "block";
    let oldPanel = document.getElementById("infoPanel");
    if (oldPanel) oldPanel.remove();
    
    document.getElementById("grid").parentNode.style.display = "block";
    const grid = document.getElementById("grid");

    grid.innerHTML = `

    <div id="s1pBtn"
    style="
    width:250px;
    height:120px;
    border:2px solid black;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:28px;
    font-weight:bold;
    cursor:pointer;
    margin:20px auto;">
    s1p?
    </div>

    <div id="sp1Btn"
    style="
    width:250px;
    height:120px;
    border:2px solid black;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:28px;
    font-weight:bold;
    cursor:pointer;
    margin:20px auto;">
    s?p1
    </div>
    `;

    document.getElementById("s1pBtn").onclick = () => {
        SEED_FILTER = "s1p?";
        buildKCGrid();
    };

    document.getElementById("sp1Btn").onclick = () => {
        SEED_FILTER = "s?p1";
        buildKCGrid();
    };
}
function getActiveGroups() {
    return DATASET_MODE === "fast"
        ? FAST_GROUPS
        : REGULAR_GROUPS;
}
// =============================
// BUILD GRID UI
// =============================
function buildKCGrid() {
    CURRENT_GROUP = null;
    CURRENT_PAGE = 0;
    CURRENT_VIEW = "grid";
    
    const grid = document.getElementById("grid");
    grid.innerHTML = "";
    const container = document.getElementById("gridContainer");
    
    container.style.display = "flex";
    container.style.alignItems = "flex-start";
    container.style.gap = "20px";
    
    let oldPanel = document.getElementById("infoPanel");
    if (oldPanel) oldPanel.remove();
    
    const panel = document.createElement("div");
    panel.id = "infoPanel";
    
    panel.innerHTML = `
    <img src="distribution.png" id="distributionImg">
    <div id="distributionText">
    Lognormal Peak Omega: 8.0609 rad/s<br>
    Amount: 111 out of 1000
    </div>
    `;
    
    container.appendChild(panel);
    if (SELECTED_CELL) {
        SELECTED_CELL.style.outline = "";
        SELECTED_CELL = null;
    }
    document.getElementById("colorControls").style.display = "block";
    document.getElementById("plotsTitle").style.display = "block";
    document.getElementById("plots").style.display = "none";

    let Kvalues = [];
    let Cvalues = [];
    let filteredGroups = {};

    const GROUPS = getActiveGroups();
    
    Object.keys(GROUPS).forEach(group => {
        let files = GROUPS[group].filter(file => {
            if (!SEED_FILTER) return true;

            if (SEED_FILTER.includes("p?")) {
                let s = SEED_FILTER.match(/s(\d+)/)?.[1];
                return s ? file.includes(`s${s}p`) : true;
            }

            if (SEED_FILTER.includes("s?")) {
                let p = SEED_FILTER.match(/p(\d+)/)?.[1];
                return p ? file.includes(`p${p}`) : true;
            }

            return true;
        });

        if (files.length) filteredGroups[group] = files;
    });

    Object.keys(filteredGroups).forEach(group => {
        let parts = group.split("_");
        let K = parseFloat(parts[0].split("=")[1]);
        let C = parseFloat(parts[1].split("=")[1]);

        if (!Kvalues.includes(K)) Kvalues.push(K);
        if (!Cvalues.includes(C)) Cvalues.push(C);
    });

    Kvalues.sort((a, b) => a - b);
    Cvalues.sort((a, b) => a - b);

    grid.style.display = "grid";
    grid.style.gridTemplateColumns = `50px 60px repeat(${Kvalues.length},120px)`;
    grid.style.gap = "6px";
    grid.style.alignItems = "center";

    grid.appendChild(document.createElement("div"));
    grid.appendChild(document.createElement("div"));

    let kTitle = document.createElement("div");
    kTitle.innerHTML = "<b>K/w₀</b>";
    kTitle.style.gridColumn = `3 / span ${Kvalues.length}`;
    kTitle.style.textAlign = "center";
    kTitle.style.fontSize = "20px";
    grid.appendChild(kTitle);

    grid.appendChild(document.createElement("div"));
    grid.appendChild(document.createElement("div"));

    Kvalues.forEach(K => {
        let h = document.createElement("div");
        h.innerHTML = `<b>${Math.round(K / 8.0609)}</b>`;
        h.style.textAlign = "center";
        grid.appendChild(h);
    });

    let cLabel = document.createElement("div");
    cLabel.innerHTML = "<b>C</b>";
    cLabel.style.gridRow = `3 / span ${Cvalues.length}`;
    cLabel.style.display = "flex";
    cLabel.style.alignItems = "center";
    cLabel.style.justifyContent = "center";
    grid.appendChild(cLabel);

    [...Cvalues].reverse().forEach(C => {
        let rowLabel = document.createElement("div");
        rowLabel.innerHTML = `<b>${C}</b>`;
        grid.appendChild(rowLabel);

        Kvalues.forEach(K => {
            let groupKey = `K=${K}_C=${C}`;
            let cell = document.createElement("div");

            cell.style.height = "90px";
            cell.style.border = "1px solid black";
            cell.style.display = "flex";
            cell.style.alignItems = "center";
            cell.style.justifyContent = "center";

            if (filteredGroups[groupKey]) {
                cell.style.background = "white";
                cell.style.cursor = "pointer";
                cell.innerHTML = `${filteredGroups[groupKey].length}<br>plots`;

                cell.onclick = () => {
                    if (SELECTED_CELL) SELECTED_CELL.style.outline = "";
                    SELECTED_CELL = cell;
                    cell.style.outline = "4px solid red";

                    history.pushState(
                        { view: "group", group: groupKey },
                        "",
                        "#group"
                    );

                    showGroup(groupKey, 0, filteredGroups[groupKey]);
                };
            } else {
                cell.style.background = "#ddd";
                cell.innerHTML = "";
            }

            grid.appendChild(cell);
        });
    });
}

// =============================
// SHOW GROUP
// =============================
function showGroup(groupName, page = 0, customFiles = null) {
    CURRENT_GROUP = groupName;
    CURRENT_PAGE = page;
    CURRENT_VIEW = "plots";

    const plots = document.getElementById("plots");
    plots.style.display = "block";   // ADD THIS
    plots.innerHTML = "";
    
    const GROUPS = getActiveGroups();
    let files;
    
    if (customFiles) {
        files = [...customFiles];
        CURRENT_FILES = [...customFiles];
    } else if (CURRENT_FILES) {
        files = [...CURRENT_FILES];
    } else {
        files = [...GROUPS[groupName]];
    }
    files.sort((a, b) => {
    
        const sa = parseInt(
            a.match(/s(\d+)p(\d+)/)?.[1] || 0
        );
    
        const pa = parseInt(
            a.match(/s(\d+)p(\d+)/)?.[2] || 0
        );
    
        const sb = parseInt(
            b.match(/s(\d+)p(\d+)/)?.[1] || 0
        );
    
        const pb = parseInt(
            b.match(/s(\d+)p(\d+)/)?.[2] || 0
        );
    
        if (SEED_FILTER === "s1p?") {
            return pa - pb;
        }
    
        return sa - sb;
    });

    const totalPages = Math.ceil(files.length / PLOTS_PER_PAGE);

    let start = page * PLOTS_PER_PAGE;
    let end = Math.min(start + PLOTS_PER_PAGE, files.length);

    let container = document.createElement("div");
    container.style.display = "grid";
    container.style.gridTemplateColumns = "1fr 1fr";
    container.style.gap = "5px";
    plots.appendChild(container);

    (async function render() {
        for (let i = start; i < end; i++) {
            let div = document.createElement("div");
            div.style.height = "350px";
            container.appendChild(div);

            loadAndPlot(files[i], div);

            await new Promise(r => setTimeout(r, 50));
        }
    })();

    let nav = document.createElement("div");
    nav.style.textAlign = "center";
    nav.innerHTML = `
        <button id="prevBtn">Previous</button>
        Page ${page + 1} / ${totalPages}
        <button id="nextBtn">Next</button>
    `;

    plots.appendChild(nav);

    document.getElementById("prevBtn").onclick = () => {
        if (CURRENT_PAGE > 0) showGroup(CURRENT_GROUP, CURRENT_PAGE - 1);
    };

    document.getElementById("nextBtn").onclick = () => {
        if (CURRENT_PAGE < totalPages - 1) showGroup(CURRENT_GROUP, CURRENT_PAGE + 1);
    };
}

// =============================
// LOAD + CACHE
// =============================
async function loadAndPlot(file, div) {
    console.log("Loading:", file);
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
// PLOT
// =============================
function drawPlot(d, div, file) {
    let title = file
        .replace("data_", "")            //delete this line if build all data py changed. 
        .replace("T500N1000_", "")
        .replace("_raster.json", "");
    if (!COLOR_MODE || !d.color) {
        Plotly.newPlot(div, [{
            x: d.x,
            y: d.y,
            mode: "markers",
            type: "scattergl",
            marker: { size: 2, color: "#0000dd" }
        }], {
            title: { text: title, x: 0.5 },
            margin: { t: 30, l: 40, r: 10, b: 40 }
        });

        return;
    }

    const groups = {};

    for (let i = 0; i < d.x.length; i++) {
        const c = d.color[i] || "#bbb";
        if (!groups[c]) groups[c] = { x: [], y: [] };
        groups[c].x.push(d.x[i]);
        groups[c].y.push(d.y[i]);
    }

    const traces = Object.keys(groups).map(c => ({
        x: groups[c].x,
        y: groups[c].y,
        mode: "markers",
        type: "scattergl",
        name: c,
        marker: { size: 2, color: c }
    }));

    Plotly.newPlot(div, traces, {
        showlegend: true,
        title: { text: title, x: 0.5 },
        margin: { t: 30, l: 40, r: 10, b: 40 }
    });
}
