const GeometryLab = (function(){

    let canvas, ctx, slider, stageOut, playBtn, resetBtn, stageText, explanation;
    let uCard, sCard, vCard, bars, downloadBtn;
    let inputs;

    const SCALE = 140;
    let stage = 3;
    let playing = false;
    let rafId = null;

    function rand(){
        return Number((Math.random() * 4 - 2).toFixed(1));
    }

    function setMatrix(M){
        inputs.a.value = M[0][0];
        inputs.b.value = M[0][1];
        inputs.c.value = M[1][0];
        inputs.d.value = M[1][1];
    }

    function getMatrix(){
        return [
            [parseFloat(inputs.a.value) || 0, parseFloat(inputs.b.value) || 0],
            [parseFloat(inputs.c.value) || 0, parseFloat(inputs.d.value) || 0]
        ];
    }

    function multiplyMatrixVector(M, p){
        return [
            M[0][0] * p[0] + M[0][1] * p[1],
            M[1][0] * p[0] + M[1][1] * p[1]
        ];
    }

    function generateCircle(){
        const pts = [];
        for(let t = 0; t <= 2 * Math.PI; t += 0.03){
            pts.push([Math.cos(t), Math.sin(t)]);
        }
        return pts;
    }

    function transformPoints(points, M){
        return points.map(p => multiplyMatrixVector(M, p));
    }

    function interpolateShape(A, B, t){
        return A.map((p, i) => [
            p[0] + (B[i][0] - p[0]) * t,
            p[1] + (B[i][1] - p[1]) * t
        ]);
    }

    function resizeCanvas(){
        SVDUtils.fitCanvasToContainer(canvas);
    }

    function center(){
        return { x: canvas.width / 2, y: canvas.height / 2 };
    }

    function scaleFactor(){
        return SCALE * (canvas.width / 1000);
    }

    function drawAxes(){
        const { x: cx, y: cy } = center();
        ctx.strokeStyle = SVDUtils.cssVar("--border") || "#cccccc";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(canvas.width, cy);
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, canvas.height);
        ctx.stroke();
    }

    function drawShape(points, color){
        const { x: cx, y: cy } = center();
        const s = scaleFactor();
        ctx.strokeStyle = color;
        ctx.lineWidth = 4 * (canvas.width / 1000);
        ctx.beginPath();
        points.forEach((p, i) => {
            const x = cx + p[0] * s;
            const y = cy - p[1] * s;
            if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.stroke();
    }

    function drawArrow(v, color, label){
        const { x: cx, y: cy } = center();
        const s = scaleFactor();
        const x = cx + v[0] * s;
        const y = cy - v[1] * s;

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 3 * (canvas.width / 1000);

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y, 5 * (canvas.width / 1000), 0, Math.PI * 2);
        ctx.fill();

        ctx.font = `${14 * (canvas.width / 1000)}px Inter`;
        ctx.fillText(label, x + 8, y + 8);
    }

    function formatMatrix(M){
        return M.map(row => row.map(x => SVDUtils.fmt(x)).join("   ")).join("\n");
    }

    function update(){
        resizeCanvas();
        if(canvas.width <= 2 || canvas.height <= 2) return;

        const A = getMatrix();
        const svd = numeric.svd(A);
        const U = svd.U;
        const Sigma = [[svd.S[0], 0], [0, svd.S[1]]];
        const VT = numeric.transpose(svd.V);

        uCard.textContent = formatMatrix(U);
        sCard.textContent = formatMatrix(Sigma);
        vCard.textContent = formatMatrix(VT);

        const maxBar = Math.max(svd.S[0], svd.S[1], 0.001);
        bars.innerHTML = `
            <div>
                σ₁ = ${SVDUtils.fmt(svd.S[0])}
                <div class="bar" style="width:${(svd.S[0] / maxBar) * 100}%"></div>
            </div>
            <div>
                σ₂ = ${SVDUtils.fmt(svd.S[1])}
                <div class="bar" style="width:${(svd.S[1] / maxBar) * 100}%"></div>
            </div>
        `;

        const circle = generateCircle();
        const afterVT = transformPoints(circle, VT);
        const afterSigma = transformPoints(afterVT, Sigma);
        const afterU = transformPoints(afterSigma, U);

        let currentShape;

        if(stage < 1){
            currentShape = interpolateShape(circle, afterVT, stage);
            stageText.textContent = "Applying Vᵀ";
            explanation.textContent = "The circle is rotating. Vᵀ changes orientation but does not stretch the shape.";
        } else if(stage < 2){
            currentShape = interpolateShape(afterVT, afterSigma, stage - 1);
            stageText.textContent = "Applying Σ";
            explanation.textContent = "The singular values stretch the shape along special directions, turning the circle into an ellipse.";
        } else {
            currentShape = interpolateShape(afterSigma, afterU, stage - 2);
            stageText.textContent = "Applying U";
            explanation.textContent = "The ellipse undergoes a final rotation to produce the full transformation A.";
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawAxes();
        drawShape(currentShape, SVDUtils.cssVar("--accent-2") || "#38bdf8");
        drawArrow([U[0][0], U[1][0]], SVDUtils.cssVar("--danger") || "#ef4444", "u₁");
        drawArrow([U[0][1], U[1][1]], SVDUtils.cssVar("--success") || "#22c55e", "u₂");
    }

    function animate(){
        if(!playing) return;
        stage += 0.008;
        if(stage > 3) stage = 0;
        slider.value = stage;
        stageOut.textContent = stage.toFixed(2);
        update();
        rafId = requestAnimationFrame(animate);
    }

    function bindEvents(){
        document.querySelectorAll(".matrix-grid input").forEach(input => {
            input.addEventListener("input", update);
        });

        slider.addEventListener("input", () => {
            stage = parseFloat(slider.value);
            stageOut.textContent = stage.toFixed(2);
            update();
        });

        resetBtn.addEventListener("click", () => {
            playing = false;
            playBtn.textContent = "▶ Play";
            stage = 0;
            slider.value = 0;
            stageOut.textContent = "0.00";
            update();
        });

        playBtn.addEventListener("click", () => {
            playing = !playing;
            playBtn.textContent = playing ? "⏸ Pause" : "▶ Play";
            if(playing) rafId = requestAnimationFrame(animate);
        });

        document.querySelectorAll("[data-preset]").forEach(btn => {
            btn.addEventListener("click", () => {
                const type = btn.dataset.preset;
                switch(type){
                    case "stretch": setMatrix([[3,0],[0,1]]); break;
                    case "rotation": setMatrix([[0,-1],[1,0]]); break;
                    case "shear": setMatrix([[1,1],[0,1]]); break;
                    case "reflection": setMatrix([[-1,0],[0,1]]); break;
                    case "singular": setMatrix([[2,4],[1,2]]); break;
                    case "random": setMatrix([[rand(),rand()],[rand(),rand()]]); break;
                }
                update();
            });
        });

        downloadBtn.addEventListener("click", () => {
            SVDUtils.downloadCanvas(canvas, "svd-geometry.png");
        });

        window.addEventListener("resize", SVDUtils.debounce(update, 150));
    }

    function init(){
        canvas = document.getElementById("canvas");
        ctx = canvas.getContext("2d");
        slider = document.getElementById("stageSlider");
        stageOut = document.getElementById("stageOut");
        playBtn = document.getElementById("playBtn");
        resetBtn = document.getElementById("resetBtn");
        stageText = document.getElementById("stageText");
        explanation = document.getElementById("explanation");
        uCard = document.getElementById("uCard");
        sCard = document.getElementById("sCard");
        vCard = document.getElementById("vCard");
        bars = document.getElementById("bars");
        downloadBtn = document.getElementById("downloadGeoBtn");

        inputs = {
            a: document.getElementById("a"),
            b: document.getElementById("b"),
            c: document.getElementById("c"),
            d: document.getElementById("d")
        };

        bindEvents();
        update();
    }

    function onShow(){
        update();
    }

    return { init, onShow, update };
})();
