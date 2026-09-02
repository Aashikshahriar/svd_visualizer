# SVD Studio

> An interactive visual journey through one of the most beautiful ideas in linear algebra.
> Live demo: https://aashikshahriar.github.io/svd_visualizer/

## What if every matrix was telling a story?

Most people first encounter Singular Value Decomposition (SVD) as a mysterious equation:

$$
A = U\Sigma V^T
$$

Three matrices and lots of symbols. A decomposition that seems abstract and difficult.

But hidden behind this notation is an incredibly simple geometric story — and, with a bit more matrix arithmetic, a genuinely useful compression trick. This project makes both visible, live in your browser, on your own data.

It has three labs:

| Lab | What it does |
|---|---|
| 📐 **2D Geometry** | Animates how a 2×2 matrix rotates and stretches a unit circle into an ellipse, stage by stage: `V^T → Σ → U`. |
| 🧮 **Matrix Lab** | Runs full SVD on any matrix you type in (up to 8×8), shows `U`, `Σ`, `Vᵀ`, and lets you build the best rank-`k` approximation with live error/energy stats. |
| 🖼️ **Image Compression** | Upload any photo. Every image is just a matrix of pixels — SVD decomposes it, and you can throw away the weaker singular values to compress it, watching the reconstruction sharpen as `k` grows. |

Everything — including the image SVD — runs client-side in JavaScript. Nothing is uploaded anywhere.

---

# The Story Begins with a Circle

Imagine drawing a perfect unit circle. Every point on that circle represents a direction in space.

Now apply a matrix `A`. The circle begins to move. It rotates. It stretches. It changes shape. Eventually, the circle becomes an ellipse.

The question is: **how exactly did the matrix transform the circle?** SVD gives us the answer, by splitting `A` into three simpler transformations:

$$
A = U\Sigma V^T
$$

- **`V^T` — rotate.** Nothing stretches. The circle remains a circle; only its orientation changes.
- **`Σ` — stretch.** A diagonal matrix of *singular values* `σ₁, σ₂` that stretch space along special directions, turning the circle into an ellipse.
- **`U` — rotate again.** The ellipse's shape is already final; this step only rotates it into its final orientation.

The **2D Geometry** tab animates exactly this, with a scrubbable timeline, matrix presets (stretch, rotation, shear, reflection, a singular/rank-deficient case, and random), and live `U`/`Σ`/`Vᵀ` readouts.

---

# Every Matrix Is Also a Ranked List of Directions

The same three-matrix idea works for *any* rectangular matrix, not just 2×2 ones. `U` and `V` are sets of orthogonal directions in the input's row/column space, and each singular value `σᵢ` says how much "energy" the matrix has along that direction — always sorted largest first.

That ranking is what makes SVD useful for compression: keep the top `k` singular values and discard the rest, and you get the *best possible* rank-`k` approximation of the original matrix (in a least-squares sense — this is the Eckart–Young theorem).

The **Matrix Lab** tab lets you explore this directly:

- Type or generate an `m × n` matrix (presets: random, identity, low-rank, symmetric).
- See its full `U`, `Σ`, `Vᵀ` decomposition as tables.
- Drag a rank slider and watch the reconstruction `Â_k`, the Frobenius reconstruction error, the % of total energy (Σσᵢ²) captured, and how many numbers you'd need to store versus the original.
- Download the singular-value spectrum as a PNG, or export `A`, `U`, `Σ`, `V` as JSON.

---

# Turning a Photo Into a Matrix

A grayscale image of `h × w` pixels *is* an `h × w` matrix — each entry is a brightness value. SVD on that matrix gives you a sum of rank-1 "layers":

$$
A = \sum_{i=1}^{r} \sigma_i \, u_i v_i^T
$$

Keep only the first `k` terms and you get a compressed approximation that needs `k(h + w + 1)` numbers instead of `h·w` — often a large saving, because natural images concentrate most of their energy in the first few singular values.

The **Image Compression** tab does exactly this on any photo you upload:

1. The image is downscaled (Fast/Balanced/Detailed presets) so SVD stays fast in the browser, then converted to a pixel matrix.
2. SVD runs in a **Web Worker**, so the page never freezes — even on a phone.
3. A rank slider reconstructs the image live from the cached `U`, `Σ`, `V`, with stats for rank used, energy captured, storage used, and compression ratio.
4. A log-scale chart shows how fast the singular values decay.
5. A gallery shows the first several **rank-1 "eigen-images"** — `σᵢ · uᵢ · vᵢᵀ` rendered on its own — the individual building blocks SVD is summing to reconstruct the photo.
6. Switch **Grayscale ↔ Color (RGB)** to run SVD per channel and reconstruct in full color.
7. Download the reconstruction, the spectrum chart, or any individual eigen-image as PNG.

---

# Why Is SVD Important?

SVD is one of the most powerful ideas in mathematics, data science, and machine learning:

- **Image & data compression** — keep the largest singular values, discard the rest.
- **Principal Component Analysis (PCA)** — finds the directions that contain the most information in a dataset; built directly on SVD.
- **Recommendation systems** — matrix factorization methods closely related to SVD power systems like Netflix, Spotify, and YouTube.
- **Machine learning** — dimensionality reduction, feature extraction, latent representations, low-rank approximation, denoising.

---

# Technologies Used

- HTML5, CSS3 (responsive, light/dark themes, no build step)
- Vanilla JavaScript, split into small per-lab modules (`js/`)
- Canvas API for all rendering — geometry animation, charts, image previews, eigen-images
- Web Workers for off-main-thread image SVD, with a synchronous fallback if unavailable
- [numeric.js](https://github.com/sloisel/numeric) for the underlying SVD/linear algebra

## Project structure

```
svd_visualizer/
├── index.html          # markup for all three tabs
├── style.css            # design tokens, layout, responsive rules, themes
├── js/
│   ├── utils.js         # SVD wrapper (handles any m×n), reconstruction, charts, downloads
│   ├── geometry.js       # 2D Geometry tab
│   ├── matrixLab.js      # Matrix Lab tab
│   ├── imageLab.js       # Image Compression tab (worker orchestration, gallery, stats)
│   ├── svdWorker.js       # background SVD computation for images
│   └── app.js            # theme toggle + tab switching + init
└── readme.md
```

`numeric.svd` only accepts matrices with rows ≥ columns, so `SVDUtils.computeSVD()` transposes wide matrices internally and swaps `U`/`V` back — every lab (and the worker) goes through this one wrapper, so it's correct for any shape.

---

# Run Locally

Clone the repository:

```bash
git clone https://github.com/Aashikshahriar/svd_visualizer.git
cd svd_visualizer
```

Start a local server (the Image Compression tab uses a Web Worker, which most browsers block on `file://`, so serve it over HTTP):

```bash
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000
```

No build step, no dependencies to install — everything loads from a CDN or is plain JS/CSS/HTML.

---

# Mobile & Desktop

The layout is fully responsive: the sidebar stacks below the visualization on narrow screens, tables and charts scroll horizontally instead of overflowing, buttons meet touch-target size guidelines, and the image lab supports drag-and-drop on desktop and tap-to-upload (the OS picker offers the camera too) on mobile.

---

# A Final Thought

At first glance, SVD seems complicated. Three matrices. Strange notation. Dense linear algebra.

But beneath the symbols lies a surprisingly elegant idea:

1. Rotate.
2. Stretch.
3. Rotate again.

And once you see a matrix as a ranked list of directions, a photograph becomes just another matrix waiting to be decomposed. This project exists to make both ideas visible — and to let you try them on your own numbers and your own pictures.
