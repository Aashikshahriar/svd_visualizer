(function(){

    function initTheme(){
        const themeBtn = document.getElementById("themeBtn");
        const stored = localStorage.getItem("svd-theme");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

        if(stored === "dark" || (!stored && prefersDark)){
            document.body.classList.add("dark");
            themeBtn.textContent = "☀️";
        }

        themeBtn.addEventListener("click", () => {
            document.body.classList.toggle("dark");
            const isDark = document.body.classList.contains("dark");
            themeBtn.textContent = isDark ? "☀️" : "🌙";
            localStorage.setItem("svd-theme", isDark ? "dark" : "light");

            GeometryLab.update();
            MatrixLab.onShow();
            ImageLab.onShow();
        });
    }

    function initTabs(){
        const tabBtns = document.querySelectorAll(".tab-btn");
        const panels = {
            geometry: document.getElementById("tab-geometry"),
            matrix: document.getElementById("tab-matrix"),
            image: document.getElementById("tab-image")
        };

        tabBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const tab = btn.dataset.tab;

                tabBtns.forEach(b => {
                    b.classList.toggle("active", b === btn);
                    b.setAttribute("aria-selected", b === btn ? "true" : "false");
                });

                Object.entries(panels).forEach(([key, el]) => {
                    el.classList.toggle("active", key === tab);
                });

                if(tab === "geometry") GeometryLab.onShow();
                if(tab === "matrix") MatrixLab.onShow();
                if(tab === "image") ImageLab.onShow();
            });
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        initTheme();
        initTabs();
        GeometryLab.init();
        MatrixLab.init();
        ImageLab.init();
    });

})();
