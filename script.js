const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const slider = document.getElementById("stageSlider");
const playBtn = document.getElementById("playBtn");
const resetBtn = document.getElementById("resetBtn");
const themeBtn = document.getElementById("themeBtn");

const stageText = document.getElementById("stageText");
const explanation = document.getElementById("explanation");

const uCard = document.getElementById("uCard");
const sCard = document.getElementById("sCard");
const vCard = document.getElementById("vCard");

const bars = document.getElementById("bars");

const centerX = canvas.width / 2;
const centerY = canvas.height / 2;

const SCALE = 140;

let stage = 3;
let playing = false;

const inputs = {
    a: document.getElementById("a"),
    b: document.getElementById("b"),
    c: document.getElementById("c"),
    d: document.getElementById("d")
};

document
.querySelectorAll(".matrix-grid input")
.forEach(input => {
    input.addEventListener("input", update);
});

slider.addEventListener("input", () => {
    stage = parseFloat(slider.value);
    update();
});

themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
});

resetBtn.addEventListener("click", () => {

    playing = false;
    playBtn.textContent = "▶ Play";

    stage = 0;
    slider.value = 0;

    update();
});

playBtn.addEventListener("click", () => {

    playing = !playing;

    playBtn.textContent =
        playing ? "⏸ Pause" : "▶ Play";

    if (playing) {
        requestAnimationFrame(animate);
    }
});

document
.querySelectorAll("[data-preset]")
.forEach(btn => {

    btn.addEventListener("click", () => {

        const type = btn.dataset.preset;

        switch(type){

            case "stretch":
                setMatrix([[3,0],[0,1]]);
                break;

            case "rotation":
                setMatrix([[0,-1],[1,0]]);
                break;

            case "shear":
                setMatrix([[1,1],[0,1]]);
                break;

            case "reflection":
                setMatrix([[-1,0],[0,1]]);
                break;

            case "random":
                setMatrix([
                    [rand(),rand()],
                    [rand(),rand()]
                ]);
                break;
        }

        update();
    });
});

function rand(){
    return Number(
        (Math.random()*4 - 2)
        .toFixed(1)
    );
}

function setMatrix(M){

    inputs.a.value = M[0][0];
    inputs.b.value = M[0][1];

    inputs.c.value = M[1][0];
    inputs.d.value = M[1][1];
}

function animate(){

    if(!playing) return;

    stage += 0.01;

    if(stage > 3){
        stage = 0;
    }

    slider.value = stage;

    update();

    requestAnimationFrame(animate);
}

function getMatrix(){

    return [

        [
            parseFloat(inputs.a.value),
            parseFloat(inputs.b.value)
        ],

        [
            parseFloat(inputs.c.value),
            parseFloat(inputs.d.value)
        ]
    ];
}

function multiplyMatrixVector(M,p){

    return [

        M[0][0]*p[0] +
        M[0][1]*p[1],

        M[1][0]*p[0] +
        M[1][1]*p[1]
    ];
}

function generateCircle(){

    const pts = [];

    for(let t=0;t<=2*Math.PI;t+=0.03){

        pts.push([
            Math.cos(t),
            Math.sin(t)
        ]);
    }

    return pts;
}

function transformPoints(points,M){

    return points.map(
        p => multiplyMatrixVector(M,p)
    );
}

function interpolateShape(A,B,t){

    return A.map((p,i)=>[

        p[0] + (B[i][0]-p[0])*t,

        p[1] + (B[i][1]-p[1])*t

    ]);
}

function drawAxes(){

    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = 1;

    ctx.beginPath();

    ctx.moveTo(0,centerY);
    ctx.lineTo(canvas.width,centerY);

    ctx.moveTo(centerX,0);
    ctx.lineTo(centerX,canvas.height);

    ctx.stroke();
}

function drawShape(points,color){

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;

    ctx.beginPath();

    points.forEach((p,i)=>{

        const x =
            centerX + p[0]*SCALE;

        const y =
            centerY - p[1]*SCALE;

        if(i===0)
            ctx.moveTo(x,y);
        else
            ctx.lineTo(x,y);
    });

    ctx.closePath();
    ctx.stroke();
}

function drawArrow(v,color,label){

    const x =
        centerX + v[0]*SCALE;

    const y =
        centerY - v[1]*SCALE;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    ctx.lineWidth = 3;

    ctx.beginPath();

    ctx.moveTo(centerX,centerY);
    ctx.lineTo(x,y);

    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x,y,5,0,Math.PI*2);
    ctx.fill();

    ctx.font = "14px Inter";
    ctx.fillText(label,x+8,y+8);
}

function formatMatrix(M){

    return M
    .map(row =>
        row
        .map(x =>
            x.toFixed(3)
        )
        .join("   ")
    )
    .join("\n");
}

function update(){

    const A = getMatrix();

    const svd = numeric.svd(A);

    const U = svd.U;

    const Sigma = [

        [svd.S[0],0],
        [0,svd.S[1]]

    ];

    const VT =
        numeric.transpose(
            svd.V
        );

    uCard.textContent =
        formatMatrix(U);

    sCard.textContent =
        formatMatrix(Sigma);

    vCard.textContent =
        formatMatrix(VT);

    bars.innerHTML = `
        <div>
            σ₁ = ${svd.S[0].toFixed(3)}
            <div class="bar"
            style="width:${svd.S[0]*70}px">
            </div>
        </div>

        <div>
            σ₂ = ${svd.S[1].toFixed(3)}
            <div class="bar"
            style="width:${svd.S[1]*70}px">
            </div>
        </div>
    `;

    const circle =
        generateCircle();

    const afterVT =
        transformPoints(
            circle,
            VT
        );

    const afterSigma =
        transformPoints(
            afterVT,
            Sigma
        );

    const afterU =
        transformPoints(
            afterSigma,
            U
        );

    let currentShape;

    if(stage < 1){

        currentShape =
            interpolateShape(
                circle,
                afterVT,
                stage
            );

        stageText.textContent =
            "Applying Vᵀ";

        explanation.textContent =
            "The circle is rotating. Vᵀ changes orientation but does not stretch the shape.";
    }

    else if(stage < 2){

        currentShape =
            interpolateShape(
                afterVT,
                afterSigma,
                stage - 1
            );

        stageText.textContent =
            "Applying Σ";

        explanation.textContent =
            "The singular values stretch the shape along special directions, turning the circle into an ellipse.";
    }

    else{

        currentShape =
            interpolateShape(
                afterSigma,
                afterU,
                stage - 2
            );

        stageText.textContent =
            "Applying U";

        explanation.textContent =
            "The ellipse undergoes a final rotation to produce the full transformation A.";
    }

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    drawAxes();

    drawShape(
        currentShape,
        "#38bdf8"
    );

    drawArrow(
        [U[0][0],U[1][0]],
        "#ef4444",
        "u₁"
    );

    drawArrow(
        [U[0][1],U[1][1]],
        "#22c55e",
        "u₂"
    );
}

update();