importScripts(
    "https://cdnjs.cloudflare.com/ajax/libs/numeric/1.2.6/numeric.min.js",
    "utils.js"
);

self.onmessage = function(e){
    const { id, values, rows, cols } = e.data;

    try{
        const M = new Array(rows);
        for(let i = 0; i < rows; i++){
            M[i] = Array.prototype.slice.call(values, i * cols, i * cols + cols);
        }

        const svd = SVDUtils.computeSVD(M);
        const r = svd.S.length;

        // Stored transposed (singular-index major) so each column of U/V is
        // contiguous in memory: fast to slice out for reconstruction/eigen-images.
        const flatU = new Float64Array(rows * r);
        for(let t = 0; t < r; t++){
            const off = t * rows;
            for(let i = 0; i < rows; i++){
                flatU[off + i] = svd.U[i][t];
            }
        }

        const flatV = new Float64Array(cols * r);
        for(let t = 0; t < r; t++){
            const off = t * cols;
            for(let j = 0; j < cols; j++){
                flatV[off + j] = svd.V[j][t];
            }
        }

        self.postMessage({
            id,
            ok: true,
            rows, cols, r,
            U: flatU,
            S: Float64Array.from(svd.S),
            V: flatV
        }, [flatU.buffer, flatV.buffer]);

    } catch(err){
        self.postMessage({ id, ok: false, error: String(err && err.message || err) });
    }
};
