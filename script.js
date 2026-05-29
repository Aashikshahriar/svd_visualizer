const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const centerX = 400;
const centerY = 400;
const scale = 150;

document
.getElementById("computeBtn")
.addEventListener("click", compute);

function generateCircle(){

    const pts=[];

    for(let t=0;t<=2*Math.PI;t+=0.05){

        pts.push([
            Math.cos(t),
            Math.sin(t)
        ]);
    }

    return pts;
}

function transformPoint(M,p){

    return [
        M[0][0]*p[0] + M[0][1]*p[1],
        M[1][0]*p[0] + M[1][1]*p[1]
    ];
}

function drawAxes(){

    ctx.strokeStyle="#ddd";

    ctx.beginPath();

    ctx.moveTo(0,centerY);
    ctx.lineTo(800,centerY);

    ctx.moveTo(centerX,0);
    ctx.lineTo(centerX,800);

    ctx.stroke();
}

function drawShape(points,color){

    ctx.strokeStyle=color;

    ctx.beginPath();

    points.forEach((p,i)=>{

        let x=centerX + p[0]*scale;
        let y=centerY - p[1]*scale;

        if(i===0)
            ctx.moveTo(x,y);
        else
            ctx.lineTo(x,y);
    });

    ctx.stroke();
}

function compute(){

    const a=parseFloat(document.getElementById("a").value);
    const b=parseFloat(document.getElementById("b").value);
    const c=parseFloat(document.getElementById("c").value);
    const d=parseFloat(document.getElementById("d").value);

    const A=[
        [a,b],
        [c,d]
    ];

    const svd=numeric.svd(A);

    document.getElementById("svdOutput").textContent=
`
U =
${JSON.stringify(svd.U,null,2)}

Σ =
${JSON.stringify(svd.S,null,2)}

V =
${JSON.stringify(svd.V,null,2)}
`;

    ctx.clearRect(0,0,800,800);

    drawAxes();

    const circle=generateCircle();

    drawShape(circle,"blue");

    const transformed=
        circle.map(p=>transformPoint(A,p));

    drawShape(transformed,"red");
}

compute();