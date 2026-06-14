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

// =============================
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

        if (!Kvalues.includes(K))
            Kvalues.push(K);

        if (!Cvalues.includes(C))
            Cvalues.push(C);
    });

    Kvalues.sort((a,b)=>a-b);
    Cvalues.sort((a,b)=>a-b);

    // +1 because first column is C labels
    grid.style.display = "grid";
    grid.style.gridTemplateColumns =
        `80px repeat(${Kvalues.length},120px)`;
    grid.style.gap = "6px";

    // empty corner
    let corner = document.createElement("div");
    corner.innerHTML = "<b>C \\ K/w₀</b>";
    grid.appendChild(corner);

    // K headers
    Kvalues.forEach(K=>{

        let h=document.createElement("div");

        h.style.fontWeight="bold";
        h.style.textAlign="center";

        h.innerHTML=(K/8.0666).toFixed(1);

        grid.appendChild(h);

    });

    // largest C first (top row)
    [...Cvalues].reverse().forEach(C=>{

        let rowLabel=document.createElement("div");

        rowLabel.style.fontWeight="bold";
        rowLabel.style.display="flex";
        rowLabel.style.alignItems="center";
        rowLabel.style.justifyContent="center";

        rowLabel.innerHTML=C;

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

                cell.style.cursor="pointer";
                cell.style.background="white";

                cell.innerHTML=`${GROUPS[groupKey].length}<br>plots`;

                cell.onclick=()=>showGroup(groupKey);

            }
            else{

                cell.style.background="#dddddd";
                cell.style.color="#888";
                cell.innerHTML="—";

            }

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
