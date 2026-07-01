<<<<<<< HEAD
let REGULAR_GROUPS = {};
let FAST_GROUPS = {};
const DATA_CACHE = {};

const PLOTS_PER_PAGE = 8;
const STATE = {
    datasetMode: "regular",
    seedFilter: null,
    currentGroup: null,
    currentPage: 0,
    currentFiles: [],
    currentView: "home",
    selectedCell: null,
    colorMode: false
};

init();

window.addEventListener("popstate", handlePopState);

async function init() {
    const manifest = await fetch("split_data/manifest.json")
        .then(response => response.json())
        .catch(error => {
            console.error("Missing split_data/manifest.json", error);
            return [];
        });

    buildFileMap(manifest);
    wireControls();
    history.replaceState(createHistoryState("home"), "", "#home");
    buildSeedChooser(false);
}

function wireControls() {
    document.getElementById("normalBtn").addEventListener("click", () => {
        STATE.colorMode = false;
        refreshPlots();
    });

    document.getElementById("colorBtn").addEventListener("click", () => {
        STATE.colorMode = true;
        refreshPlots();
    });
}

function handlePopState(event) {
    const nextState = event.state || { view: "home" };

    STATE.datasetMode = nextState.datasetMode || "regular";
    STATE.seedFilter = nextState.seedFilter || null;
    STATE.currentGroup = nextState.group || null;
    STATE.currentPage = nextState.page || 0;
    STATE.currentView = nextState.view || "home";

    if (nextState.view === "seed") {
        buildSeedTypeChooser(false);
        return;
    }

    if (nextState.view === "grid") {
        buildKCGrid(false);
        return;
    }

    if (nextState.view === "plots" && nextState.group) {
        showGroup(nextState.group, nextState.page || 0, null, false);
        return;
    }

    buildSeedChooser(false);
}

function createHistoryState(view, extras = {}) {
    return {
        view,
        datasetMode: STATE.datasetMode,
        seedFilter: STATE.seedFilter,
        group: STATE.currentGroup,
        page: STATE.currentPage,
        ...extras
    };
}

function pushViewState(view, extras = {}) {
    history.pushState(createHistoryState(view, extras), "", getHashForView(view));
}

function getHashForView(view) {
    if (view === "seed") return "#seed";
    if (view === "grid") return "#grid";
    if (view === "plots") return "#group";
    return "#home";
}

function clearUI() {
    const grid = document.getElementById("grid");
    const plots = document.getElementById("plots");
    const infoPanel = document.getElementById("infoPanel");

    if (infoPanel) {
        infoPanel.remove();
    }

    if (window.Plotly && plots) {
        Plotly.purge(plots);
    }

    grid.innerHTML = "";
    plots.innerHTML = "";
}

function resetLayout() {
    clearUI();

    const grid = document.getElementById("grid");
    grid.className = "";
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "";
    grid.style.gridTemplateRows = "";
    grid.style.gridAutoFlow = "";
    grid.style.gap = "";
    grid.style.alignItems = "";
    grid.style.justifyItems = "";
    grid.style.width = "";
    grid.style.margin = "";

    document.getElementById("colorControls").style.display = "none";
    document.getElementById("plotsTitle").style.display = "none";
    document.getElementById("plots").style.display = "none";

    if (STATE.selectedCell) {
        STATE.selectedCell.style.outline = "";
        STATE.selectedCell = null;
    }

    STATE.currentGroup = null;
    STATE.currentPage = 0;
    STATE.currentFiles = [];
}

function setBreadcrumb() {
    const box = document.getElementById("breadcrumb");
    const datasetLabel = STATE.datasetMode === "regular" ? "Regular" : "Fast Individuals";
    const seedLabel = STATE.seedFilter || "";

    let html = `<span class="crumb" data-view="home">Home</span>`;

    if (STATE.currentView !== "home") {
        html += ` &nbsp;>&nbsp; <span class="crumb" data-view="seed">${datasetLabel}</span>`;
    }

    if (STATE.currentView === "grid" || STATE.currentView === "plots") {
        html += ` &nbsp;>&nbsp; <span class="crumb" data-view="grid">${seedLabel}</span>`;
    }

    if (STATE.currentView === "plots" && STATE.currentGroup) {
        html += ` &nbsp;>&nbsp; <span class="crumb" data-view="plots">${STATE.currentGroup}</span>`;
    }

    box.innerHTML = html;

    box.querySelectorAll("[data-view]").forEach(element => {
        element.addEventListener("click", () => {
            const view = element.getAttribute("data-view");

            if (view === "home") {
                buildSeedChooser();
                return;
            }

            if (view === "seed") {
                buildSeedTypeChooser();
                return;
            }

            if (view === "grid") {
                buildKCGrid();
                return;
            }

            if (view === "plots" && STATE.currentGroup) {
                showGroup(STATE.currentGroup, STATE.currentPage);
            }
        });
    });
}

function buildFileMap(files) {
    REGULAR_GROUPS = {};
    FAST_GROUPS = {};

    files.forEach(file => {
        const kMatch = file.match(/K(-?[0-9.]+)/);
        const cMatch = file.match(/C(-?[0-9.]+)/);

        const K = kMatch ? parseFloat(kMatch[1]) : NaN;
        const C = cMatch ? parseFloat(cMatch[1]) : NaN;

        if (Number.isNaN(K) || Number.isNaN(C)) {
            return;
        }

        const groupKey = `K=${K}_C=${C}`;
        const target = file.includes("_FT(") ? FAST_GROUPS : REGULAR_GROUPS;

        if (!target[groupKey]) {
            target[groupKey] = [];
        }

        target[groupKey].push(file);
    });
}

function getActiveGroups() {
    return STATE.datasetMode === "fast" ? FAST_GROUPS : REGULAR_GROUPS;
}

function filterFilesBySeed(files) {
    if (!STATE.seedFilter) {
        return [...files];
    }

    if (STATE.seedFilter === "s1p?") {
        return files.filter(file => /s1p\d+(?!\d)/.test(file));
    }

    if (STATE.seedFilter === "s?p1") {
        return files.filter(file => /s\d+p1(?!\d)/.test(file));
    }

    return [...files];
}

function sortFilesForDisplay(files) {
    return [...files].sort((left, right) => {
        const leftMatch = left.match(/s(\d+)p(\d+)/);
        const rightMatch = right.match(/s(\d+)p(\d+)/);

        const leftSeed = parseInt(leftMatch?.[1] || "0", 10);
        const leftP = parseInt(leftMatch?.[2] || "0", 10);
        const rightSeed = parseInt(rightMatch?.[1] || "0", 10);
        const rightP = parseInt(rightMatch?.[2] || "0", 10);

        if (STATE.seedFilter === "s1p?") {
            return leftP - rightP || leftSeed - rightSeed;
        }

        if (STATE.seedFilter === "s?p1") {
            return leftSeed - rightSeed || leftP - rightP;
        }

        return leftSeed - rightSeed || leftP - rightP;
    });
}

function createMenuButton(id, text, width, height) {
    const button = document.createElement("button");
    button.type = "button";
    button.id = id;
    button.textContent = text;
    button.style.width = width;
    button.style.height = height;
    button.style.border = "2px solid black";
    button.style.display = "flex";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";
    button.style.fontSize = "28px";
    button.style.fontWeight = "bold";
    button.style.cursor = "pointer";
    button.style.margin = "20px auto";
    button.style.background = "white";
    return button;
}

function buildSeedChooser(updateHistory = true) {
    STATE.currentView = "home";
    STATE.seedFilter = null;
    STATE.currentGroup = null;
    STATE.currentPage = 0;
    STATE.currentFiles = [];

    resetLayout();
    setBreadcrumb();

    const grid = document.getElementById("grid");
    grid.className = "gridMenu";
    grid.style.gridTemplateColumns = "1fr";
    grid.style.gap = "20px";
    grid.style.justifyItems = "center";

    const regularButton = createMenuButton("regularBtn", "Regular", "300px", "100px");
    const fastButton = createMenuButton("fastBtn", "Fast Individuals", "300px", "100px");

    regularButton.addEventListener("click", () => {
        STATE.datasetMode = "regular";
        buildSeedTypeChooser();
    });

    fastButton.addEventListener("click", () => {
        STATE.datasetMode = "fast";
        buildSeedTypeChooser();
    });

    grid.appendChild(regularButton);
    grid.appendChild(fastButton);

    if (updateHistory) {
        pushViewState("home");
    }
}

function buildSeedTypeChooser(updateHistory = true) {
    STATE.currentView = "seed";
    STATE.seedFilter = null;
    STATE.currentGroup = null;
    STATE.currentPage = 0;
    STATE.currentFiles = [];

    resetLayout();
    setBreadcrumb();

    const grid = document.getElementById("grid");
    grid.className = "gridMenu";
    grid.style.gridTemplateColumns = "1fr";
    grid.style.gap = "20px";
    grid.style.justifyItems = "center";

    const s1pButton = createMenuButton("s1pBtn", "s1p?", "250px", "120px");
    const sp1Button = createMenuButton("sp1Btn", "s?p1", "250px", "120px");

    s1pButton.addEventListener("click", () => {
        STATE.seedFilter = "s1p?";
        buildKCGrid();
    });

    sp1Button.addEventListener("click", () => {
        STATE.seedFilter = "s?p1";
        buildKCGrid();
    });

    grid.appendChild(s1pButton);
    grid.appendChild(sp1Button);

    if (updateHistory) {
        pushViewState("seed");
    }
}

function buildKCGrid(updateHistory = true) {
    STATE.currentView = "grid";
    STATE.currentGroup = null;
    STATE.currentPage = 0;

    resetLayout();
    setBreadcrumb();

    const grid = document.getElementById("grid");
    const panel = document.createElement("div");
    panel.id = "infoPanel";
    panel.innerHTML = `
        <img src="distribution.png" id="distributionImg" alt="Distribution">
        <div id="distributionText">
            Lognormal Peak Omega: 8.0609 rad/s<br>
            Amount: 111 out of 1000
        </div>
    `;
    panel.style.flexShrink = "0";
    panel.style.height = "fit-content";
    document.getElementById("gridArea").appendChild(panel);

    document.getElementById("colorControls").style.display = "block";
    document.getElementById("plotsTitle").style.display = "block";
    document.getElementById("plots").style.display = "none";

    const activeGroups = getActiveGroups();
    const filteredGroups = {};

    Object.keys(activeGroups).forEach(groupKey => {
        const files = filterFilesBySeed(activeGroups[groupKey]);
        if (files.length) {
            filteredGroups[groupKey] = files;
        }
    });

    const kValues = [];
    const cValues = [];

    Object.keys(filteredGroups).forEach(groupKey => {
        const [kPart, cPart] = groupKey.split("_");
        const kValue = parseFloat(kPart.split("=")[1]);
        const cValue = parseFloat(cPart.split("=")[1]);

        if (!kValues.includes(kValue)) {
            kValues.push(kValue);
        }

        if (!cValues.includes(cValue)) {
            cValues.push(cValue);
        }
    });

    kValues.sort((a, b) => a - b);
    cValues.sort((a, b) => a - b);

    grid.className = "gridKC";
    grid.style.gridTemplateColumns = `50px 60px repeat(${kValues.length}, 70px)`;

    grid.appendChild(document.createElement("div"));
    grid.appendChild(document.createElement("div"));

    const kTitle = document.createElement("div");
    kTitle.innerHTML = "<b>K / w</b>";
    kTitle.style.gridColumn = `3 / span ${kValues.length}`;
    kTitle.style.textAlign = "center";
    kTitle.style.fontSize = "20px";
    grid.appendChild(kTitle);

    grid.appendChild(document.createElement("div"));
    grid.appendChild(document.createElement("div"));

    kValues.forEach(kValue => {
        const header = document.createElement("div");
        header.innerHTML = `<b>${Math.round(kValue / 8.0609)}</b>`;
        header.style.textAlign = "center";
        grid.appendChild(header);
    });

    const cLabel = document.createElement("div");
    cLabel.innerHTML = "<b>C</b>";
    cLabel.style.gridRow = `3 / span ${cValues.length}`;
    cLabel.style.display = "flex";
    cLabel.style.alignItems = "center";
    cLabel.style.justifyContent = "center";
    grid.appendChild(cLabel);

    [...cValues].reverse().forEach(cValue => {
        const rowLabel = document.createElement("div");
        rowLabel.innerHTML = `<b>${cValue}</b>`;
        grid.appendChild(rowLabel);

        kValues.forEach(kValue => {
            const groupKey = `K=${kValue}_C=${cValue}`;
            const cell = document.createElement("div");
            cell.className = "gridCell";

            if (filteredGroups[groupKey]) {
                cell.style.background = "white";
                cell.style.cursor = "pointer";
                cell.innerHTML = `${filteredGroups[groupKey].length}<br>plots`;

                cell.addEventListener("click", () => {
                    if (STATE.selectedCell) {
                        STATE.selectedCell.style.outline = "";
                    }

                    STATE.selectedCell = cell;
                    cell.style.outline = "4px solid red";
                    showGroup(groupKey, 0, filteredGroups[groupKey]);
                });
            } else {
                cell.style.background = "#ddd";
                cell.innerHTML = "";
            }

            grid.appendChild(cell);
        });
    });

    if (!kValues.length || !cValues.length) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center;">No matching data found.</div>';
    }

    if (updateHistory) {
        pushViewState("grid");
    }
}

function showGroup(groupName, page = 0, customFiles = null, updateHistory = true) {
    STATE.currentView = "plots";
    STATE.currentGroup = groupName;
    STATE.currentPage = page;
    STATE.currentFiles = customFiles ? [...customFiles] : [];

    setBreadcrumb();

    const plots = document.getElementById("plots");
    plots.style.display = "block";
    plots.innerHTML = "";

    document.getElementById("colorControls").style.display = "block";
    document.getElementById("plotsTitle").style.display = "block";

    const files = sortFilesForDisplay(customFiles || resolveGroupFiles(groupName));
    STATE.currentFiles = [...files];

    const totalPages = Math.max(1, Math.ceil(files.length / PLOTS_PER_PAGE));
    const start = page * PLOTS_PER_PAGE;
    const end = Math.min(start + PLOTS_PER_PAGE, files.length);

    const container = document.createElement("div");
    container.style.display = "grid";
    container.style.gridTemplateColumns = "1fr 1fr";
    container.style.gap = "5px";
    plots.appendChild(container);

    if (files.length === 0) {
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center;">No plots available for this group.</div>';
    } else {
        (async () => {
            for (let index = start; index < end; index += 1) {
                const plotContainer = document.createElement("div");
                plotContainer.style.height = "350px";
                container.appendChild(plotContainer);
                await loadAndPlot(files[index], plotContainer);
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        })();
    }

    const nav = document.createElement("div");
    nav.style.textAlign = "center";
    nav.style.marginTop = "12px";
    nav.innerHTML = `
        <button id="prevBtn" type="button">Previous</button>
        Page ${page + 1} / ${totalPages}
        <button id="nextBtn" type="button">Next</button>
    `;
    plots.appendChild(nav);

    document.getElementById("prevBtn").addEventListener("click", () => {
        if (STATE.currentPage > 0) {
            showGroup(STATE.currentGroup, STATE.currentPage - 1);
        }
    });

    document.getElementById("nextBtn").addEventListener("click", () => {
        if (STATE.currentPage < totalPages - 1) {
            showGroup(STATE.currentGroup, STATE.currentPage + 1);
        }
    });

    if (updateHistory) {
        pushViewState("plots", { group: groupName, page });
    }
}

function resolveGroupFiles(groupName) {
    const groups = getActiveGroups();
    const files = groups[groupName] || [];
    return filterFilesBySeed(files);
}

function refreshPlots() {
    if (STATE.currentView !== "plots" || !STATE.currentGroup) {
        return;
    }

    const currentFiles = STATE.currentFiles.length ? STATE.currentFiles : resolveGroupFiles(STATE.currentGroup);
    showGroup(STATE.currentGroup, STATE.currentPage, currentFiles, false);
}

async function loadAndPlot(file, div) {
    if (DATA_CACHE[file]) {
        drawPlot(DATA_CACHE[file], div, file);
        return;
    }

    try {
        const data = await fetch(`split_data/${file}`).then(response => response.json());
        DATA_CACHE[file] = data;
        drawPlot(data, div, file);
    } catch (error) {
        console.error("Failed loading file:", file, error);
    }
}

function drawPlot(data, div, file) {
    const title = file
        .replace("data_", "")
        .replace("T500N1000_", "")
        .replace("_raster.json", "");

    if (!STATE.colorMode || !data.color) {
        Plotly.newPlot(div, [{
            x: data.x,
            y: data.y,
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

    for (let index = 0; index < data.x.length; index += 1) {
        const color = data.color[index] || "#bbb";
        if (!groups[color]) {
            groups[color] = { x: [], y: [] };
        }
        groups[color].x.push(data.x[index]);
        groups[color].y.push(data.y[index]);
    }

    const traces = Object.keys(groups).map(color => ({
        x: groups[color].x,
        y: groups[color].y,
        mode: "markers",
        type: "scattergl",
        name: color,
        marker: { size: 2, color }
    }));

    Plotly.newPlot(div, traces, {
        showlegend: true,
        title: { text: title, x: 0.5 },
        margin: { t: 30, l: 40, r: 10, b: 40 }
    });
}
=======
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
    buildSeedChooser();;
    
    document.getElementById("normalBtn").onclick = function () {
    
        COLOR_MODE = false;
    
        if (
            document.getElementById("plots").style.display === "block" &&
            CURRENT_GROUP
        ) {
            showGroup(CURRENT_GROUP, CURRENT_PAGE);
        }
    };
    
    document.getElementById("colorBtn").onclick = function () {
    
        COLOR_MODE = true;
    
        if (
            document.getElementById("plots").style.display === "block" &&
            CURRENT_GROUP
        ) {
            showGroup(CURRENT_GROUP, CURRENT_PAGE);
        }
    };
}
function clearUI() {
    const grid = document.getElementById("grid");
    const plots = document.getElementById("plots");

    Plotly.purge(plots);   // VERY IMPORTANT (removes ghost canvases)

    grid.innerHTML = "";
    plots.innerHTML = "";
}
// =============================
// BUILD GROUPS FROM FILES
// =============================
function buildFileMap(files) {

    GROUPS = {};

    files.forEach(file => {

        let kMatch = file.match(/K([0-9.]+)/);
        let cMatch = file.match(/C([0-9.]+)/);

        let K = kMatch ? Math.abs(parseFloat(kMatch[1])) : NaN;
        let C = cMatch ? parseFloat(cMatch[1]) : NaN;
        
        if (isNaN(K) || isNaN(C))
            return;
        
        let groupKey = `K=${K}_C=${C}`;

        if (!GROUPS[groupKey]) {
            GROUPS[groupKey] = [];
        }

        GROUPS[groupKey].push(file);
    });
}
function buildSeedChooser(){
    clearUI();
    CURRENT_VIEW = "home";
    document.getElementById("colorControls").style.display = "none";
    document.getElementById("plotsTitle").style.display = "none";
    document.getElementById("plots").style.display = "none";
    document.getElementById("grid").style.display = "block";
    const grid=document.getElementById("grid");

    // 🚨 IMPORTANT: reset grid before injecting seed UI
    grid.innerHTML = "";
    grid.innerHTML=`
    
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
            margin:20px auto;
         ">
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
            margin:20px auto;
         ">
        s?p1
    </div>
    
    `;
    
    document.getElementById("s1pBtn").onclick=()=>{
    
        SEED_FILTER = "s1p?";
    
        history.pushState(
            {view:"s1p"},
            "",
            "#s1p"
        );
    
        CURRENT_VIEW="s1p";
    
        buildKCGrid();
    
    };
    document.getElementById("sp1Btn").onclick=()=>{
    
        SEED_FILTER = "s?p1";
    
        history.pushState(
            {view:"sp1"},
            "",
            "#sp1"
        );
    
        CURRENT_VIEW="sp1";
    
        buildKCGrid();
    
    };

}
/// =============================
// BUILD GRID UI
// =============================
function buildKCGrid() {
    CURRENT_GROUP = null;
    CURRENT_PAGE = 0;
    CURRENT_VIEW = "grid";
    
    //CLEAR OLD SEED UI COMPLETELY
    const grid = document.getElementById("grid");
    grid.innerHTML = "";

    document.getElementById("colorControls").style.display = "block";
    document.getElementById("plotsTitle").style.display = "block";
    document.getElementById("plots").style.display = "none";
    document.getElementById("grid").style.display = "grid";

    const plots = document.getElementById("plots");

    plots.innerHTML = "";
    plots.style.display = "none";

    let Kvalues = [];
    let Cvalues = [];
    let filteredGroups = {};

    Object.keys(GROUPS).forEach(group => {
    
        let files = GROUPS[group].filter(file => {
    
            if (!SEED_FILTER)
                return true;
    
            if (SEED_FILTER.startsWith("s?p")) {
                const targetP = Number(SEED_FILTER.match(/p(\d+)/)[1]);
            
                const seed = parseSeed(file);
                return seed && seed.p === targetP;
            }
            if (SEED_FILTER.startsWith("s1p?")) {
                const targetS = Number(SEED_FILTER.match(/s(\d+)/)[1]);
            
                const seed = parseSeed(file);
                return seed && seed.s === targetS;
            }
            return true;
        });
    
        if (files.length)
            filteredGroups[group] = files;
    });
    Object.keys(filteredGroups).forEach(group => {

        let parts = group.split("_");

        let K = parseFloat(parts[0].split("=")[1]);
        let C = parseFloat(parts[1].split("=")[1]);
                
        if (!isNaN(K) && !Kvalues.includes(K))
            Kvalues.push(K);
        
        if (!isNaN(C) && !Cvalues.includes(C))
            Cvalues.push(C);
    });   // <-- THIS WAS MISSING
    
    Kvalues.sort((a,b)=>a-b);
    Cvalues.sort((a,b)=>a-b);

    const rows = Cvalues.length;

    grid.style.display = "grid";
    grid.style.gridTemplateColumns =
        `50px 60px repeat(${Kvalues.length},120px)`;

    grid.style.gap = "6px";
    grid.style.alignItems = "center";

    // -----------------------
    // TOP TITLE ROW
    // -----------------------

    grid.appendChild(document.createElement("div"));
    grid.appendChild(document.createElement("div"));

    let kTitle = document.createElement("div");

    kTitle.innerHTML = "<b>K/w₀</b>";

    kTitle.style.gridColumn = `3 / span ${Kvalues.length}`;
    kTitle.style.textAlign = "center";
    kTitle.style.fontSize = "20px";

    grid.appendChild(kTitle);

    // -----------------------
    // K HEADER ROW
    // -----------------------

    grid.appendChild(document.createElement("div"));
    grid.appendChild(document.createElement("div"));

    Kvalues.forEach(K=>{

        let h=document.createElement("div");

        h.innerHTML=`<b>${Math.round(K/8.0609)}</b>`;

        h.style.textAlign="center";

        grid.appendChild(h);

    });

    // -----------------------
    // C LABEL
    // -----------------------

    let cLabel=document.createElement("div");

    cLabel.innerHTML="<b>C</b>";

    cLabel.style.gridRow=`3 / span ${rows}`;

    cLabel.style.display="flex";
    cLabel.style.alignItems="center";
    cLabel.style.justifyContent="center";

    grid.appendChild(cLabel);

    // -----------------------
    // DATA ROWS
    // -----------------------

    [...Cvalues].reverse().forEach(C=>{

        let rowLabel=document.createElement("div");

        rowLabel.innerHTML=`<b>${C}</b>`;

        rowLabel.style.display="flex";
        rowLabel.style.alignItems="center";
        rowLabel.style.justifyContent="center";

        grid.appendChild(rowLabel);

        Kvalues.forEach(K=>{

            let groupKey=`K=${K}_C=${C}`;

            let cell=document.createElement("div");

            cell.style.height = "90px";
            
            cell.style.fontSize = "16px";
            cell.style.fontWeight = "bold";
            cell.style.lineHeight = "1.4";
            
            cell.style.lineHeight = "1.2";
            cell.style.border="1px solid black";

            cell.style.display="flex";
            cell.style.alignItems="center";
            cell.style.justifyContent="center";

            if(filteredGroups[groupKey]){

                cell.style.background="white";
                cell.style.cursor="pointer";

                cell.innerHTML=`${filteredGroups[groupKey].length}<br>plots`;

                cell.onclick=()=>{
                    if (SELECTED_CELL)
                            SELECTED_CELL.style.outline = "";
                    
                        SELECTED_CELL = cell;
                    
                        cell.style.outline = "4px solid red";
                    
                    history.pushState(
                        {
                            view:"group",
                            group:groupKey
                        },
                        "",
                        "#group"
                    );
                
                    showGroup(
                        groupKey,
                        0,
                        filteredGroups[groupKey]
                    );
                
                };

                cell.onmouseenter=()=>{
                    cell.style.background="#f2f2f2";
                };

                cell.onmouseleave=()=>{
                    cell.style.background="white";
                };

            }
            else{

                cell.style.background="#dddddd";
                cell.style.color="#888";

                cell.innerHTML="";

            }

            grid.appendChild(cell);

        });

    });

}
function showGroup(groupName, page = 0, customFiles = null) {
    document.getElementById("colorControls").style.display = "block";
    document.getElementById("plotsTitle").style.display = "block";

    document.getElementById("grid").style.display = "grid";
    document.getElementById("plots").style.display = "block";
    CURRENT_VIEW = "plots";
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
    CURRENT_GROUP = groupName;
    
    CURRENT_PAGE = page;

    const plots = document.getElementById("plots");
    plots.innerHTML = "";

    let files = customFiles
        ? [...customFiles]
        : [...GROUPS[groupName]];

    files.sort((a, b) => {

        let pa = a.match(/s\d+p(\d+)/);
        let pb = b.match(/s\d+p(\d+)/);

        let na = pa ? parseInt(pa[1]) : 9999;
        let nb = pb ? parseInt(pb[1]) : 9999;

        return na - nb;
    });

    const totalPages = Math.ceil(files.length / PLOTS_PER_PAGE);

    let start = page * PLOTS_PER_PAGE;
    let end = Math.min(start + PLOTS_PER_PAGE, files.length);

    let container = document.createElement("div");

    container.style.display = "grid";
    container.style.gridTemplateColumns = "1fr 1fr";
    container.style.gap = "5px";

    plots.appendChild(container);
    renderPageStaggered(start, end, files, container);
    
    async function renderPageStaggered(start, end, files, container) {
    
        for (let i = start; i < end; i++) {
    
            let div = document.createElement("div");
    
            div.style.height = "350px";
            div.style.width = "100%";
    
            container.appendChild(div);
    
            loadAndPlot(files[i], div);
    
            // ⭐ CRITICAL: yield to browser
            await new Promise(r => setTimeout(r, 50));
        }
    }

    let nav = document.createElement("div");
    
    nav.style.position = "sticky";
    nav.style.bottom = "0";
    
    nav.style.background = "white";
    nav.style.padding = "12px 10px";
    nav.style.borderTop = "1px solid #ddd";
    
    nav.style.zIndex = "999";
    
    nav.style.textAlign = "center";
    
    // iOS safe area fix
    nav.style.paddingBottom = "calc(12px + env(safe-area-inset-bottom))";

    nav.innerHTML =
        `<button id="prevBtn" style="font-size:16px; padding:8px 14px;">Previous</button>
         &nbsp;&nbsp;
         Page ${page + 1} / ${totalPages}
         &nbsp;&nbsp;
         <button id="nextBtn" style="font-size:16px; padding:8px 14px;">Next</button>`;

    plots.appendChild(nav);

    document.getElementById("prevBtn").onclick = () => {

        if (CURRENT_PAGE > 0)
            showGroup(CURRENT_GROUP, CURRENT_PAGE - 1);

    };

    document.getElementById("nextBtn").onclick = () => {

        if (CURRENT_PAGE < totalPages - 1)
            showGroup(CURRENT_GROUP, CURRENT_PAGE + 1);

    };

}
function parseFileMeta(file) {

    let kMatch = file.match(/K([0-9.]+)/);
    let cMatch = file.match(/C([0-9.]+)/);
    let seedMatch = file.match(/s\d+p\d+/);

    return {
        K: kMatch ? parseFloat(kMatch[1]) : null,
        C: cMatch ? parseFloat(cMatch[1]).toFixed(2) : null,
        seed: seedMatch ? seedMatch[0] : "?"
    };
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

        d.meta = parseFileMeta(file);
        DATA_CACHE[file] = d;
        Plotly.purge(div);
        drawPlot(d, div, file);

    } catch (err) {
        console.error("Failed loading file:", file, err);
    }
}
// =============================
// PLOT FUNCTION
// =============================
function cleanTitle(file) {

    // remove duplicated T...N... patterns like T500N1000 repeated
    let cleaned = file;

    // collapse repeated segments like T500N1000_T500N1000
    cleaned = cleaned.replace(/(T\d+N\d+)(_?\1)+/g, "$1");

    // optional: also remove double underscores
    cleaned = cleaned.replace(/_+/g, "_");

    return cleaned;
}
function drawPlot(d, div, file) {

    const experimentTag = "LNm0.5s0.736L0.1H15.0";

    if (!COLOR_MODE || !d.color) {

        // NORMAL MODE (keep as-is)
        Plotly.newPlot(div, [{
            x: d.x,
            y: d.y,
            mode: "markers",
            type: "scattergl",
            marker: {
                size: 2,
                color: "#0000dd"                 //"#1f77b4"        //"#bbbbbb"        //"#0000dd"
            }
        }], {
            title: {
                text: cleanTitle(file),
                font: { size: 14 },
                x: 0.5
            },
            margin: { t: 30, l: 40, r: 10, b: 40 }
        });

        return;
    }

    // ============================
    // COLOR MODE (WITH LEGEND)
    // ============================

    const traces = [];

    const groups = {};

    // group points by color
    for (let i = 0; i < d.x.length; i++) {

        const c = d.color[i] || "#bbbbbb";

        if (!groups[c]) {
            groups[c] = { x: [], y: [] };
        }

        groups[c].x.push(d.x[i]);
        groups[c].y.push(d.y[i]);
    }

    // convert each color group into a trace
    for (const c in groups) {

        traces.push({
            x: groups[c].x,
            y: groups[c].y,
            mode: "markers",
            type: "scattergl",
            name: c,   // <- LEGEND LABEL
            marker: {
                size: 2,
                color: c
            }
        });
    }

    Plotly.newPlot(div, traces, {
        showlegend: true,
        title: {
            text: file,
            font: { size: 14 },
            x: 0.5
        },
        margin: { t: 30, l: 40, r: 10, b: 40 }
    });
}
>>>>>>> Update dataset
