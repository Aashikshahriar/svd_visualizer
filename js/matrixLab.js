const MatrixLab = (function(){

    let rowsInput, colsInput, resizeBtn, textarea, applyBtn;
    let rankSlider, rankOut;
    let statRank, statEnergy, statError, statCompression;
    let tableA, tableRecon, tableU, tableS, tableVT;
    let chartCanvas, downloadChartBtn, downloadDataBtn;

    let currentA = null;
    let currentSVD = null;
    let initialized = false;

    function randVal(){
        return Number((Math.random() * 8 - 4).toFixed(1));
    }

    function matrixToText(M){
        return M.map(row => row.map(v => v).join("\t")).join("\n");
    }

    function textToMatrix(text){
        const rows = text.trim().split("\n").map(r => r.trim()).filter(r => r.length);
        const M = rows.map(r =>
            r.split(/[\s,]+/).filter(x => x.length).map(Number)
        );
        const cols = M[0] ? M[0].length : 0;
        if(M.some(r => r.length !== cols || r.some(isNaN))){
            throw new Error("Rows must all have the same number of numeric values.");
        }
        return M;
    }

    function randomMatrix(m, n){
        const M = [];
        for(let i = 0; i < m; i++){
            const row = [];
            for(let j = 0; j < n; j++) row.push(randVal());
            M.push(row);
        }
        return M;
    }

    function applyPreset(type){
        const m = parseInt(rowsInput.value, 10);
        const n = parseInt(colsInput.value, 10);
        let M;

        switch(type){
            case "identity":
                M = Array.from({length:m}, (_,i) => Array.from({length:n}, (_,j) => i===j ? 1 : 0));
                break;
            case "lowrank": {
                const u = Array.from({length:m}, () => randVal());
                const v = Array.from({length:n}, () => randVal());
                M = u.map(ui => v.map(vj => Number((ui*vj/4).toFixed(2))));
                break;
            }
            case "symmetric": {
                const size = Math.max(m, n);
                rowsInput.value = size;
                colsInput.value = size;
                const base = randomMatrix(size, size);
                M = base.map((row, i) => row.map((_, j) => (base[i][j] + base[j][i]) / 2 ));
                M = M.map(row => row.map(v => Number(v.toFixed(2))));
                break;
            }
            default:
                M = randomMatrix(m, n);
        }

        textarea.value = matrixToText(M);
        compute();
    }

    function resize(){
        const m = SVDUtils.clamp(parseInt(rowsInput.value, 10) || 1, 1, 8);
        const n = SVDUtils.clamp(parseInt(colsInput.value, 10) || 1, 1, 8);
        rowsInput.value = m;
        colsInput.value = n;
        textarea.value = matrixToText(randomMatrix(m, n));
        compute();
    }

    function renderDiagTable(el, S){
        const n = S.length;
        const M = Array.from({length:n}, (_,i) => Array.from({length:n}, (_,j) => i===j ? S[i] : 0));
        const wrap = document.createElement("div");
        SVDUtils.buildMatrixTable(wrap, M, { digits: 2 });
        el.innerHTML = "";
        el.appendChild(wrap.firstChild);
    }

    function compute(){
        let M;
        try{
            M = textToMatrix(textarea.value);
        } catch(e){
            SVDUtils.toast(e.message);
            return;
        }

        if(M.length === 0 || M[0].length === 0){
            SVDUtils.toast("Enter a valid matrix first.");
            return;
        }

        currentA = M;
        rowsInput.value = M.length;
        colsInput.value = M[0].length;

        try{
            currentSVD = SVDUtils.computeSVD(M);
        } catch(e){
            SVDUtils.toast("Could not compute SVD for this matrix.");
            return;
        }

        const r = currentSVD.S.length;
        rankSlider.max = r;
        rankSlider.value = r;
        rankOut.textContent = r;

        SVDUtils.buildMatrixTable(tableA, currentA, { digits: 2 });
        SVDUtils.buildMatrixTable(tableU, currentSVD.U, { digits: 2 });
        renderDiagTable(tableS, currentSVD.S);
        SVDUtils.buildMatrixTable(tableVT, numeric.transpose(currentSVD.V), { digits: 2 });

        SVDUtils.drawSpectrumChart(chartCanvas, currentSVD.S, { logScale: false });

        updateReconstruction();
    }

    function updateReconstruction(){
        if(!currentA || !currentSVD) return;

        const k = parseInt(rankSlider.value, 10);
        rankOut.textContent = k;

        const recon = SVDUtils.reconstruct(currentSVD.U, currentSVD.S, currentSVD.V, k);
        SVDUtils.buildMatrixTable(tableRecon, recon, { digits: 2 });

        const m = currentA.length, n = currentA[0].length;
        const err = SVDUtils.frobeniusError(currentA, recon);
        const energy = SVDUtils.energyCaptured(currentSVD.S, k);
        const stored = k * (m + n + 1);
        const full = m * n;

        statRank.textContent = `${k} / ${currentSVD.S.length}`;
        statEnergy.textContent = `${energy.toFixed(1)}%`;
        statError.textContent = err.toFixed(3);
        statCompression.textContent = `${stored} / ${full}`;
    }

    function exportJSON(){
        if(!currentSVD) return;
        const data = {
            A: currentA,
            U: currentSVD.U,
            S: currentSVD.S,
            V: currentSVD.V,
            rankUsed: parseInt(rankSlider.value, 10)
        };
        SVDUtils.downloadText(JSON.stringify(data, null, 2), "svd-matrix.json", "application/json");
    }

    function bindEvents(){
        resizeBtn.addEventListener("click", resize);
        applyBtn.addEventListener("click", compute);

        rankSlider.addEventListener("input", updateReconstruction);

        document.querySelectorAll("[data-mpreset]").forEach(btn => {
            btn.addEventListener("click", () => applyPreset(btn.dataset.mpreset));
        });

        downloadChartBtn.addEventListener("click", () => {
            SVDUtils.downloadCanvas(chartCanvas, "singular-value-spectrum.png");
        });

        downloadDataBtn.addEventListener("click", exportJSON);

        window.addEventListener("resize", SVDUtils.debounce(() => {
            if(currentSVD) SVDUtils.drawSpectrumChart(chartCanvas, currentSVD.S, { logScale: false });
        }, 150));
    }

    function init(){
        rowsInput = document.getElementById("mlRows");
        colsInput = document.getElementById("mlCols");
        resizeBtn = document.getElementById("mlResize");
        textarea = document.getElementById("mlTextarea");
        applyBtn = document.getElementById("mlApply");

        rankSlider = document.getElementById("mlRankSlider");
        rankOut = document.getElementById("mlRankOut");

        statRank = document.getElementById("mlStatRank");
        statEnergy = document.getElementById("mlStatEnergy");
        statError = document.getElementById("mlStatError");
        statCompression = document.getElementById("mlStatCompression");

        tableA = document.getElementById("mlTableA");
        tableRecon = document.getElementById("mlTableRecon");
        tableU = document.getElementById("mlU");
        tableS = document.getElementById("mlS");
        tableVT = document.getElementById("mlVT");

        chartCanvas = document.getElementById("mlChart");
        downloadChartBtn = document.getElementById("mlDownloadChart");
        downloadDataBtn = document.getElementById("mlDownloadData");

        textarea.value = matrixToText(randomMatrix(4, 3));

        bindEvents();
        compute();
        initialized = true;
    }

    function onShow(){
        if(!initialized) return;
        if(currentSVD) SVDUtils.drawSpectrumChart(chartCanvas, currentSVD.S, { logScale: false });
    }

    return { init, onShow };
})();
