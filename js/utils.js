const SVDUtils = (function(){

    function clamp(v, min, max){
        return Math.max(min, Math.min(max, v));
    }

    function fmt(n, digits){
        digits = digits === undefined ? 3 : digits;
        if(!isFinite(n)) return "0";
        const v = Math.abs(n) < Math.pow(10, -digits) / 2 ? 0 : n;
        return v.toFixed(digits);
    }

    function toast(msg, ms){
        const el = document.getElementById("toast");
        if(!el) return;
        el.textContent = msg;
        el.classList.add("show");
        clearTimeout(el._t);
        el._t = setTimeout(() => el.classList.remove("show"), ms || 2200);
    }

    function downloadCanvas(canvas, filename){
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }, "image/png");
    }

    function downloadText(content, filename, mime){
        const blob = new Blob([content], { type: mime || "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // numeric.svd requires rows >= cols; this wrapper works for any shape
    // and returns the thin/economy SVD such that A ~= U * diag(S) * V^T
    function computeSVD(A){
        const m = A.length;
        const n = A[0].length;

        if(m >= n){
            const r = numeric.svd(A);
            return { U: r.U, S: r.S, V: r.V, m, n };
        }

        const AT = numeric.transpose(A);
        const r = numeric.svd(AT);
        // A^T = U' S V'^T  =>  A = V' S U'^T
        return { U: r.V, S: r.S, V: r.U, m, n };
    }

    // Reconstruct A_k = U[:, :k] * diag(S[:k]) * V[:, :k]^T as a dense array
    function reconstruct(U, S, V, k){
        const m = U.length;
        const n = V.length;
        k = clamp(k, 0, S.length);

        const out = new Array(m);
        for(let i = 0; i < m; i++){
            const row = new Array(n).fill(0);
            for(let t = 0; t < k; t++){
                const uv = U[i][t] * S[t];
                if(uv === 0) continue;
                const vRow = V;
                for(let j = 0; j < n; j++){
                    row[j] += uv * vRow[j][t];
                }
            }
            out[i] = row;
        }
        return out;
    }

    function frobeniusError(A, B){
        let s = 0;
        for(let i = 0; i < A.length; i++){
            for(let j = 0; j < A[0].length; j++){
                const d = A[i][j] - B[i][j];
                s += d * d;
            }
        }
        return Math.sqrt(s);
    }

    function energyCaptured(S, k){
        let total = 0, part = 0;
        for(let i = 0; i < S.length; i++){
            total += S[i] * S[i];
            if(i < k) part += S[i] * S[i];
        }
        return total === 0 ? 0 : (part / total) * 100;
    }

    function debounce(fn, wait){
        let t;
        return function(...args){
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), wait);
        };
    }

    function rafThrottle(fn){
        let scheduled = false, lastArgs;
        return function(...args){
            lastArgs = args;
            if(scheduled) return;
            scheduled = true;
            requestAnimationFrame(() => {
                scheduled = false;
                fn.apply(this, lastArgs);
            });
        };
    }

    function fitCanvasToContainer(canvas){
        const rect = canvas.parentElement.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(1, Math.round(rect.width * dpr));
        const h = Math.max(1, Math.round(rect.height * dpr));
        if(canvas.width !== w || canvas.height !== h){
            canvas.width = w;
            canvas.height = h;
        }
        return { w, h, dpr };
    }

    function cssVar(name){
        return getComputedStyle(document.body).getPropertyValue(name).trim();
    }

    // Generic chart: bars for small n, filled line for larger n.
    function drawSpectrumChart(canvas, values, opts){
        opts = opts || {};
        const { w, h, dpr } = fitCanvasToContainer(canvas);
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, w, h);

        // Canvas lives in a hidden (inactive) tab and has no laid-out size yet;
        // the owning tab's onShow() re-triggers this once it becomes visible.
        if(!values || values.length === 0 || w <= 2 || h <= 2) return;

        const padL = 46 * dpr;
        const padB = 26 * dpr;
        const padT = 14 * dpr;
        const padR = 14 * dpr;

        const plotW = w - padL - padR;
        const plotH = h - padT - padB;

        const useLog = !!opts.logScale;
        const positive = values.map(v => Math.max(v, 1e-6));
        const maxV = Math.max.apply(null, positive);
        const minV = useLog ? Math.min.apply(null, positive) : 0;

        function yFor(v){
            const vv = Math.max(v, 1e-6);
            if(useLog){
                const lo = Math.log(minV), hi = Math.log(maxV);
                const t = hi === lo ? 1 : (Math.log(vv) - lo) / (hi - lo);
                return padT + plotH * (1 - t);
            }
            const t = maxV === 0 ? 0 : vv / maxV;
            return padT + plotH * (1 - t);
        }

        const border = SVDUtils.cssVar("--border") || "#ddd";
        const textDim = SVDUtils.cssVar("--text-dim") || "#888";
        const accent = SVDUtils.cssVar("--accent") || "#6366f1";
        const accent2 = SVDUtils.cssVar("--accent-2") || "#22d3ee";

        ctx.strokeStyle = border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let g = 0; g <= 4; g++){
            const y = padT + (plotH / 4) * g;
            ctx.moveTo(padL, y);
            ctx.lineTo(padL + plotW, y);
        }
        ctx.stroke();

        ctx.fillStyle = textDim;
        ctx.font = `${11 * dpr}px Inter, sans-serif`;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(maxV.toFixed(2), padL - 8, padT + 4);
        ctx.fillText(useLog ? minV.toFixed(3) : "0", padL - 8, padT + plotH);

        const n = values.length;
        const asBars = n <= 24;

        if(asBars){
            const gap = plotW / n * 0.28;
            const bw = plotW / n - gap;
            values.forEach((v, i) => {
                const x = padL + i * (plotW / n) + gap / 2;
                const y = yFor(v);
                const grad = ctx.createLinearGradient(0, y, 0, padT + plotH);
                grad.addColorStop(0, accent2);
                grad.addColorStop(1, accent);
                ctx.fillStyle = grad;
                const rad = Math.min(6, bw / 2);
                roundRect(ctx, x, y, bw, (padT + plotH) - y, rad);
                ctx.fill();
            });
        } else {
            const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
            grad.addColorStop(0, hexAlpha(accent, 0.45));
            grad.addColorStop(1, hexAlpha(accent, 0.02));

            ctx.beginPath();
            values.forEach((v, i) => {
                const x = padL + (i / (n - 1)) * plotW;
                const y = yFor(v);
                if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            ctx.lineTo(padL + plotW, padT + plotH);
            ctx.lineTo(padL, padT + plotH);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.beginPath();
            values.forEach((v, i) => {
                const x = padL + (i / (n - 1)) * plotW;
                const y = yFor(v);
                if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            ctx.strokeStyle = accent;
            ctx.lineWidth = 2 * dpr;
            ctx.stroke();
        }

        ctx.strokeStyle = border;
        ctx.beginPath();
        ctx.moveTo(padL, padT + plotH);
        ctx.lineTo(padL + plotW, padT + plotH);
        ctx.stroke();

        ctx.fillStyle = textDim;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const labelStep = Math.ceil(n / 8);
        for(let i = 0; i < n; i += labelStep){
            const x = asBars ? padL + i * (plotW / n) + (plotW / n) / 2 : padL + (i / (n - 1)) * plotW;
            ctx.fillText(String(i + 1), x, padT + plotH + 6);
        }
    }

    function roundRect(ctx, x, y, w, h, r){
        r = Math.min(r, w / 2, Math.max(h, 0.001) / 2);
        if(h <= 0){ h = 0.001; }
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function hexAlpha(hex, alpha){
        const c = hex.replace("#", "").trim();
        if(c.length !== 6) return hex;
        const r = parseInt(c.slice(0,2),16);
        const g = parseInt(c.slice(2,4),16);
        const b = parseInt(c.slice(4,6),16);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    function buildMatrixTable(el, M, opts){
        opts = opts || {};
        const digits = opts.digits === undefined ? 2 : opts.digits;
        const table = document.createElement("table");
        table.className = "mtx-table";
        M.forEach(row => {
            const tr = document.createElement("tr");
            row.forEach(val => {
                const td = document.createElement("td");
                td.textContent = fmt(val, digits);
                tr.appendChild(td);
            });
            table.appendChild(tr);
        });
        el.innerHTML = "";
        el.appendChild(table);
    }

    return {
        clamp, fmt, toast, downloadCanvas, downloadText,
        computeSVD, reconstruct, frobeniusError, energyCaptured,
        debounce, rafThrottle, fitCanvasToContainer, cssVar,
        drawSpectrumChart, buildMatrixTable
    };
})();
