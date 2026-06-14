let DATA = {};
let GROUPS = {};

fetch("all_data.json?v=4")
  .then(r => r.json())
  .then(data => {
      DATA = data;

      buildGroups();
      buildMainGrid();
  })
  .catch(err => console.error("Failed to load JSON:", err));


// -----------------------------
// GROUP DATA INTO s1p1–s1p4
// -----------------------------
function buildGroups() {
    GROUPS = {};

    Object.keys(DATA).forEach(key => {

        let kMatch = key.match(/K([0-9.]+)/);
        let cMatch = key.match(/C([0-9.]+)/);

        if (!kMatch || !cMatch) return;

        let K = kMatch[1];
        let C = cMatch[1];

        let groupKey = `K=${K}_C=${C}`;

        if (!GROUPS[groupKey]) {
            GROUPS[groupKey] = [];
        }

        GROUPS[groupKey].push(key);
    });
}

// -----------------------------
// BUILD 4 MAIN GRID CELLS
// -----------------------------
function buildMainGrid() {
    const grid = document.getElementById("grid");
    grid.innerHTML = "";

    let Kvalues = [...new Set(
        Object.keys(DATA).map(k => k.match(/K([0-9.]+)/)[1])
    )];

    let Cvalues = [...new Set(
        Object.keys(DATA).map(k => k.match(/C([0-9.]+)/)[1])
    )];

    // sort numerically
    Kvalues.sort((a,b)=>a-b);
    Cvalues.sort((a,b)=>a-b);

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
                <div>K/w0 = ${(K/8.0666).toFixed(2)}</div>
                <div>C = ${C}</div>
                <div style="font-size:12px;color:gray">1 spawn seed(s) · 4 phase seed(s)</div>
            `;

            cell.onclick = () => showGroup(groupKey);

            grid.appendChild(cell);
        });
    });
}

// -----------------------------
// SHOW 4 PLOTS (2x2 LAYOUT)
// -----------------------------
function showGroup(groupName) {
    const plots = document.getElementById("plots");
    const experimentTag = "LNm0.5s0.736L0.1H15.0";
    plots.innerHTML = "";

    let keys = GROUPS[groupName].slice(0, 4);

    let container = document.createElement("div");
    container.style.display = "grid";
    container.style.gridTemplateColumns = "1fr 1fr";
    container.style.gap = "5px";          // ↓ smaller spacing
    container.style.width = "100%";

    plots.appendChild(container);

    keys.forEach((key) => {
    
        let div = document.createElement("div");
        div.style.height = "350px";
        div.style.width = "100%";
    
        container.appendChild(div);
    
        let d = DATA[key];
    
        let seedMatch = key.match(/s1p[1-4]/);
        let seed = seedMatch ? seedMatch[0] : "s?p?";
        
        let title = `${seed}_${experimentTag}`;
        // title = title.replace("s", "s ").replace("p", " p ");
    
        Plotly.newPlot(div, [{
              x: d.x,
              y: d.y,
              mode: "markers",
              type: "scattergl",
              marker: { size: 2 }
          }], {
              title: {
                  text: title,
                  font: {
                      size: 14   // smaller title
                  },
                  x: 0.5,
                  xanchor: "center",
                  y: 0.94     // move title down
              },
              margin: {
                  t: 30,   // reduce top space
                  l: 40,
                  r: 10,
                  b: 40
              }
          });
    });
}
