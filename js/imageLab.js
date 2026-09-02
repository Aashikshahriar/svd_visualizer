const ImageLab = (function(){

    let uploadZone, fileInput, imageControls, replaceBtn;
    let resolutionSelect, modeSelect;
    let statusEl, statusText, resultsEl;
    let origCanvas, origDimsLabel, reconCanvas, downloadReconBtn;
    let rankSlider, rankOut;
    let statRank, statEnergy, statStorage, statRatio;
    let chartCanvas, downloadChartBtn, gallery;

    let worker = null, workerOK = false, jobId = 0;
    const pending = {};

    const state = {
        width: 0, height: 0,
        imageData: null, imgEl: null,
        svdGray: null, svdColor: null
    };

    function initWorker(){
        try{
            worker = new Worker("js/svdWorker.js");
            worker.onmessage = e => {
                const { id, ok } = e.data;
                const p = pending[id];
                delete pending[id];
                if(!p) return;
                if(ok) p.resolve(e.data); else p.reject(new Error(e.data.error || "SVD failed"));
            };
            worker.onerror = () => { workerOK = false; };
            workerOK = true;
        } catch(e){
            workerOK = false;
        }
    }

    function svdAsync(matrix2D){
        const rows = matrix2D.length, cols = matrix2D[0].length;
        const flat = new Float64Array(rows * cols);
        for(let i = 0; i < rows; i++){
            for(let j = 0; j < cols; j++) flat[i * cols + j] = matrix2D[i][j];
        }

        if(workerOK){
            return new Promise((resolve, reject) => {
                const id = ++jobId;
                pending[id] = { resolve, reject };
                worker.postMessage({ id, values: flat, rows, cols }, [flat.buffer]);
            });
        }

        return new Promise(resolve => {
            setTimeout(() => {
                const svd = SVDUtils.computeSVD(matrix2D);
                const r = svd.S.length;
                const flatU = new Float64Array(rows * r);
                for(let t = 0; t < r; t++){
                    const off = t * rows;
                    for(let i = 0; i < rows; i++) flatU[off + i] = svd.U[i][t];
                }
                const flatV = new Float64Array(cols * r);
                for(let t = 0; t < r; t++){
                    const off = t * cols;
                    for(let j = 0; j < cols; j++) flatV[off + j] = svd.V[j][t];
                }
                resolve({ rows, cols, r, U: flatU, S: Float64Array.from(svd.S), V: flatV });
            }, 10);
        });
    }

    function showStatus(text){
        statusText.textContent = text;
        statusEl.classList.remove("hidden");
    }
    function hideStatus(){
        statusEl.classList.add("hidden");
    }

    function buildGrayMatrix(imgData, w, h){
        const d = imgData.data;
        const M = new Array(h);
        for(let y = 0; y < h; y++){
            const row = new Array(w);
            const base = y * w;
            for(let x = 0; x < w; x++){
                const idx = (base + x) * 4;
                row[x] = 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
            }
            M[y] = row;
        }
        return M;
    }

    function buildChannelMatrix(imgData, w, h, channel){
        const d = imgData.data;
        const M = new Array(h);
        for(let y = 0; y < h; y++){
            const row = new Array(w);
            const base = y * w;
            for(let x = 0; x < w; x++){
                row[x] = d[(base + x) * 4 + channel];
            }
            M[y] = row;
        }
        return M;
    }

    function loadImageFile(file){
        if(!file || !file.type || !file.type.startsWith("image/")){
            SVDUtils.toast("Please choose an image file.");
            return;
        }
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { processImage(img); URL.revokeObjectURL(url); };
        img.onerror = () => { SVDUtils.toast("Could not load that image."); URL.revokeObjectURL(url); };
        img.src = url;
    }

    async function processImage(img){
        state.imgEl = img;
        state.svdColor = null;

        const maxDim = parseInt(resolutionSelect.value, 10);
        const scale = maxDim / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height);
        const w = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
        const h = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));

        const off = document.createElement("canvas");
        off.width = w; off.height = h;
        const octx = off.getContext("2d");
        octx.imageSmoothingQuality = "high";
        octx.drawImage(img, 0, 0, w, h);
        const imgData = octx.getImageData(0, 0, w, h);

        state.width = w;
        state.height = h;
        state.imageData = imgData;

        origCanvas.width = w;
        origCanvas.height = h;
        origCanvas.getContext("2d").putImageData(imgData, 0, 0);
        origDimsLabel.textContent = `${w}×${h}px`;

        uploadZone.classList.add("hidden");
        imageControls.classList.remove("hidden");
        resultsEl.classList.add("hidden");

        showStatus("Computing SVD…");

        try{
            const M = buildGrayMatrix(imgData, w, h);
            const res = await svdAsync(M);
            state.svdGray = res;

            // Reveal the results section before drawing the chart -- its canvas
            // has zero layout size (and drawSpectrumChart no-ops) while hidden.
            hideStatus();
            resultsEl.classList.remove("hidden");

            setupRankSlider(res.r);
            SVDUtils.drawSpectrumChart(chartCanvas, Array.from(res.S), { logScale: true });
            renderGallery(res);
            updateReconstruction();

            if(modeSelect.value === "color"){
                await computeColor();
                hideStatus();
                updateReconstruction();
            }
        } catch(err){
            hideStatus();
            SVDUtils.toast("SVD failed: " + err.message);
        }
    }

    async function computeColor(){
        if(state.svdColor) return;
        showStatus("Computing color channels…");
        const w = state.width, h = state.height, imgData = state.imageData;
        const [r, g, b] = await Promise.all([
            svdAsync(buildChannelMatrix(imgData, w, h, 0)),
            svdAsync(buildChannelMatrix(imgData, w, h, 1)),
            svdAsync(buildChannelMatrix(imgData, w, h, 2))
        ]);
        state.svdColor = { r, g, b };
    }

    function setupRankSlider(r){
        rankSlider.max = r;
        const def = SVDUtils.clamp(Math.round(r * 0.15), 1, r);
        rankSlider.value = def;
        rankOut.textContent = def;
    }

    function reconstructChannelFlat(svdRes, k){
        const { rows, cols, r, U, S, V } = svdRes;
        const out = new Float64Array(rows * cols);
        for(let t = 0; t < k; t++){
            const s = S[t];
            if(s === 0) continue;
            const uOff = t * rows, vOff = t * cols;
            for(let i = 0; i < rows; i++){
                const u = U[uOff + i] * s;
                if(u === 0) continue;
                const base = i * cols;
                for(let j = 0; j < cols; j++){
                    out[base + j] += u * V[vOff + j];
                }
            }
        }
        return out;
    }

    function updateReconstruction(){
        if(!state.svdGray) return;

        const k = parseInt(rankSlider.value, 10);
        rankOut.textContent = k;

        const w = state.width, h = state.height;
        const useColor = modeSelect.value === "color" && !!state.svdColor;
        const out = new Uint8ClampedArray(w * h * 4);

        if(useColor){
            const r = reconstructChannelFlat(state.svdColor.r, k);
            const g = reconstructChannelFlat(state.svdColor.g, k);
            const b = reconstructChannelFlat(state.svdColor.b, k);
            for(let p = 0; p < w * h; p++){
                out[p * 4] = r[p]; out[p * 4 + 1] = g[p]; out[p * 4 + 2] = b[p]; out[p * 4 + 3] = 255;
            }
        } else {
            const gray = reconstructChannelFlat(state.svdGray, k);
            for(let p = 0; p < w * h; p++){
                const v = gray[p];
                out[p * 4] = v; out[p * 4 + 1] = v; out[p * 4 + 2] = v; out[p * 4 + 3] = 255;
            }
        }

        reconCanvas.width = w;
        reconCanvas.height = h;
        reconCanvas.getContext("2d").putImageData(new ImageData(out, w, h), 0, 0);

        const channels = useColor ? 3 : 1;
        let energy;
        if(useColor){
            energy = (
                SVDUtils.energyCaptured(state.svdColor.r.S, k) +
                SVDUtils.energyCaptured(state.svdColor.g.S, k) +
                SVDUtils.energyCaptured(state.svdColor.b.S, k)
            ) / 3;
        } else {
            energy = SVDUtils.energyCaptured(state.svdGray.S, k);
        }

        const stored = k * (h + w + 1) * channels;
        const full = h * w * channels;

        statRank.textContent = `${k} / ${state.svdGray.r}`;
        statEnergy.textContent = `${energy.toFixed(1)}%`;
        statStorage.textContent = stored.toLocaleString();
        statRatio.textContent = `${(full / stored).toFixed(1)}×`;
    }

    const scheduleRecon = SVDUtils.rafThrottle(updateReconstruction);

    function renderGallery(svdRes){
        gallery.innerHTML = "";
        const n = Math.min(8, svdRes.r);
        const { rows, cols } = svdRes;

        for(let t = 0; t < n; t++){
            const uOff = t * rows, vOff = t * cols;
            const layer = new Float64Array(rows * cols);
            let min = Infinity, max = -Infinity;

            for(let i = 0; i < rows; i++){
                const u = svdRes.U[uOff + i];
                const base = i * cols;
                for(let j = 0; j < cols; j++){
                    const val = u * svdRes.V[vOff + j];
                    layer[base + j] = val;
                    if(val < min) min = val;
                    if(val > max) max = val;
                }
            }

            const range = (max - min) || 1;
            const pixels = new Uint8ClampedArray(rows * cols * 4);
            for(let p = 0; p < rows * cols; p++){
                const v = Math.round(((layer[p] - min) / range) * 255);
                pixels[p * 4] = v; pixels[p * 4 + 1] = v; pixels[p * 4 + 2] = v; pixels[p * 4 + 3] = 255;
            }

            const c = document.createElement("canvas");
            c.width = cols; c.height = rows;
            c.getContext("2d").putImageData(new ImageData(pixels, cols, rows), 0, 0);

            const item = document.createElement("div");
            item.className = "gallery-item";

            const label = document.createElement("div");
            label.className = "g-label";
            label.textContent = `σ${t + 1} = ${svdRes.S[t].toFixed(1)}`;

            const dl = document.createElement("button");
            dl.className = "g-dl";
            dl.type = "button";
            dl.title = "Download this eigen-image";
            dl.textContent = "⬇";
            dl.addEventListener("click", () => SVDUtils.downloadCanvas(c, `eigen-image-${t + 1}.png`));

            item.appendChild(c);
            item.appendChild(label);
            item.appendChild(dl);
            gallery.appendChild(item);
        }
    }

    function bindEvents(){
        uploadZone.addEventListener("click", () => fileInput.click());
        replaceBtn.addEventListener("click", () => fileInput.click());

        fileInput.addEventListener("change", () => {
            if(fileInput.files && fileInput.files[0]) loadImageFile(fileInput.files[0]);
        });

        ["dragenter","dragover"].forEach(evt => {
            uploadZone.addEventListener(evt, e => {
                e.preventDefault();
                uploadZone.classList.add("dragover");
            });
        });
        ["dragleave","drop"].forEach(evt => {
            uploadZone.addEventListener(evt, e => {
                e.preventDefault();
                uploadZone.classList.remove("dragover");
            });
        });
        uploadZone.addEventListener("drop", e => {
            const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
            if(file) loadImageFile(file);
        });

        resolutionSelect.addEventListener("change", () => {
            if(state.imgEl) processImage(state.imgEl);
        });

        modeSelect.addEventListener("change", async () => {
            if(modeSelect.value === "color" && !state.svdColor && state.svdGray){
                try{
                    await computeColor();
                } catch(err){
                    SVDUtils.toast("Color SVD failed: " + err.message);
                    modeSelect.value = "gray";
                } finally {
                    hideStatus();
                }
            }
            updateReconstruction();
        });

        rankSlider.addEventListener("input", () => {
            rankOut.textContent = rankSlider.value;
            scheduleRecon();
        });

        downloadReconBtn.addEventListener("click", () => {
            SVDUtils.downloadCanvas(reconCanvas, "svd-reconstruction.png");
        });

        downloadChartBtn.addEventListener("click", () => {
            SVDUtils.downloadCanvas(chartCanvas, "image-singular-value-spectrum.png");
        });

        window.addEventListener("resize", SVDUtils.debounce(() => {
            if(state.svdGray) SVDUtils.drawSpectrumChart(chartCanvas, Array.from(state.svdGray.S), { logScale: true });
        }, 150));
    }

    function init(){
        uploadZone = document.getElementById("uploadZone");
        fileInput = document.getElementById("fileInput");
        imageControls = document.getElementById("imageControls");
        replaceBtn = document.getElementById("imgReplaceBtn");

        resolutionSelect = document.getElementById("imgResolution");
        modeSelect = document.getElementById("imgMode");

        statusEl = document.getElementById("imgStatus");
        statusText = document.getElementById("imgStatusText");
        resultsEl = document.getElementById("imageResults");

        origCanvas = document.getElementById("imgOrigCanvas");
        origDimsLabel = document.getElementById("imgOrigDims");
        reconCanvas = document.getElementById("imgReconCanvas");
        downloadReconBtn = document.getElementById("imgDownloadRecon");

        rankSlider = document.getElementById("imgRankSlider");
        rankOut = document.getElementById("imgRankOut");

        statRank = document.getElementById("imgStatRank");
        statEnergy = document.getElementById("imgStatEnergy");
        statStorage = document.getElementById("imgStatStorage");
        statRatio = document.getElementById("imgStatRatio");

        chartCanvas = document.getElementById("imgChart");
        downloadChartBtn = document.getElementById("imgDownloadChart");
        gallery = document.getElementById("imgGallery");

        initWorker();
        bindEvents();
    }

    function onShow(){
        if(state.svdGray) SVDUtils.drawSpectrumChart(chartCanvas, Array.from(state.svdGray.S), { logScale: true });
    }

    return { init, onShow };
})();
