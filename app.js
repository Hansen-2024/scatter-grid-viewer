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

        let K = kMatch ? Math.abs(parseFloat(kMatch[1])) : null;
        let C = cMatch ? parseFloat(cMatch[1]) : null;
        Math.round(K / 8.0666)
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

    let s = [];
    let Cvalues = [];

    Object.keys(GROUPS).forEach(group => {

        let parts = group.split("_");

        let K = parseFloat(parts[0].split("=")[1]);
        let C = parseFloat(parts[1].split("=")[1]);
        
        if (!Kvalues.includes(K))
            Kvalues.push(K);

        if (!Cvalues.includes(C))
            Cvalues.push(C);

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

        h.innerHTML=`<b>${Math.round(K/8.0666)}</b>`;

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

            cell.style.height="80px";
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
// =============================
// SHOW 2x2 PLOTS
// =============================
// =============================
// SHOW ALL PLOTS
// =============================
function showGroup(groupName) {

    const plots = document.getElementById("plots");
    plots.innerHTML = "";

    // show every plot in the group
    let files = GROUPS[groupName];

    // sort by s1p1, s1p2, s1p3, s1p4, ...
    files = [...files].sort((a, b) => {

        let pa = a.match(/s\d+p(\d+)/);
        let pb = b.match(/s\d+p(\d+)/);

        let na = pa ? parseInt(pa[1]) : 9999;
        let nb = pb ? parseInt(pb[1]) : 9999;

        return na - nb;
    });

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
