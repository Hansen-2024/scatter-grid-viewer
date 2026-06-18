let GROUPS = {};
let DATA_CACHE = {};
let CURRENT_GROUP = null;
let CURRENT_PAGE = 0;
let COLOR_MODE = false;
let SHOW_COLOR = false;

const PLOTS_PER_PAGE = 8;
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
    
    document.getElementById("normalBtn").onclick = function () {
        COLOR_MODE = false;
        if (CURRENT_GROUP)
            showGroup(CURRENT_GROUP, CURRENT_PAGE);
    };
    
    document.getElementById("colorBtn").onclick = function () {
        COLOR_MODE = true;
        if (CURRENT_GROUP)
            showGroup(CURRENT_GROUP, CURRENT_PAGE);
    };
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

/// =============================
// BUILD GRID UI
// =============================
function buildMainGrid() {

    const grid = document.getElementById("grid");
    grid.innerHTML = "";

    let Kvalues = [];
    let Cvalues = [];

    Object.keys(GROUPS).forEach(group => {

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

            if(GROUPS[groupKey]){

                cell.style.background="white";
                cell.style.cursor="pointer";

                cell.innerHTML=`${GROUPS[groupKey].length}<br>plots`;

                cell.onclick=()=>showGroup(groupKey);

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
function showGroup(groupName, page = 0) {

    CURRENT_GROUP = groupName;
    CURRENT_PAGE = page;

    const plots = document.getElementById("plots");
    plots.innerHTML = "";

    let files = [...GROUPS[groupName]];

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
                color: "#bbbbbb"                 //"#1f77b4"        //"#bbbbbb"
            }
        }], {
            title: {
                text: file,
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
