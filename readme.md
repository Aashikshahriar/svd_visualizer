# SVD Geometry Visualizer

> An interactive visual journey through one of the most beautiful ideas in linear algebra.

## What if every matrix was telling a story?

Most people first encounter Singular Value Decomposition (SVD) as a mysterious equation:

$$
A = U\Sigma V^T
$$

Three matrices and lots of symbols. A decomposition that seems abstract and difficult.

But hidden behind this notation is an incredibly simple geometric story. This project aims to make that story visible.

---

# The Story Begins with a Circle

Imagine drawing a perfect unit circle. Every point on that circle represents a direction in space.

Now apply a matrix (A). The circle begins to move.

It rotates. It stretches. It changes shape.

Eventually, the circle becomes an ellipse.

The question is:

> How exactly did the matrix transform the circle?

SVD gives us the answer.

---

# Every Matrix Has Three Secrets

The remarkable fact is that **every matrix can be decomposed into three simpler transformations**:

$$
A = U\Sigma V^T
$$

Instead of understanding one complicated transformation, we can understand three simple ones.

---

# Act I — Rotate the World

The first transformation is:

$$
V^T
$$

This matrix performs a rotation.

Nothing stretches. Nothing changes size.

The circle remains a circle. Only its orientation changes.

Think of taking a sheet of paper and turning it slightly before drawing on it.

That is the role of $(V^T)$.

---

# Act II — Stretch Reality

The second transformation is:

$$
\Sigma
$$

where

$$
\Sigma=
\begin{bmatrix}
\sigma_1 & 0\
0 & \sigma_2
\end{bmatrix}
$$

This matrix stretches space.

The values

$$
\sigma_1,\sigma_2
$$

are called **singular values**.

They determine how much stretching occurs along special directions.

The circle is no longer a circle.It becomes an ellipse.

One direction stretches by:

$$
\sigma_1
$$

Another stretches by:

$$
\sigma_2
$$

This is the heart of this transformation.

---

# Act III — Rotate Again

The final transformation is:

$$
U
$$

At this point the ellipse already exists.

The shape is finished.

The only remaining task is to rotate it into its final orientation.

No additional stretching occurs.

No distortion occurs.

Only a final rotation.

The result is exactly equivalent to applying the original matrix:

$$
A
$$

directly.

---

# Why Is SVD Important?

SVD is one of the most powerful ideas in mathematics, data science, and machine learning.

It appears almost everywhere.

## Image Compression

Keep only the largest singular values.

Discard the rest.

The image remains recognizable while requiring far less storage.

---

## Principal Component Analysis (PCA)

PCA is fundamentally built on SVD.

It finds the directions that contain the most information in a dataset.

---

## Recommendation Systems

Many recommendation systems rely on matrix factorization methods closely related to SVD.

Examples include:

* Netflix
* Spotify
* YouTube

---

## Machine Learning

SVD appears in:

* Dimensionality Reduction
* Feature Extraction
* Latent Representations
* Low-Rank Approximation
* Data Compression

---

# What This Visualizer Shows

This project visualizes each step of the decomposition process.

## Stage 0

The original unit circle.

---

## Stage 1

Apply

$$
V^T
$$

The circle rotates.

---

## Stage 2

Apply

$$
\Sigma
$$

The circle stretches into an ellipse.

---

## Stage 3

Apply

$$
U
$$

The ellipse rotates into its final orientation.

---

# Mathematical Background

Given a matrix

$$
A \in \mathbb{R}^{m \times n}
$$

its Singular Value Decomposition is

$$
A = U\Sigma V^T
$$

where:

### U

$$
U^TU = I
$$

An orthogonal matrix containing the left singular vectors.

---

### Σ

$$
\Sigma=
\begin{bmatrix}
\sigma_1 & 0\
0 & \sigma_2
\end{bmatrix}
$$

A diagonal matrix containing the singular values.

---

### V

$$
V^TV = I
$$

An orthogonal matrix containing the right singular vectors.

---

# Technologies Used

* HTML5
* CSS3
* JavaScript
* Canvas API
* Numeric.js

---

# Run Locally

Clone the repository:

```bash
git clone https://github.com/Aashikshahriar/svd_visualizer.git
```

Move into the project directory:

```bash
cd svd_visualizer
```

Start a local server:

```bash
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000
```

---

# A Final Thought

At first glance, SVD seems complicated.

Three matrices.

Strange notation.

Dense linear algebra.

But beneath the symbols lies a surprisingly elegant idea:

1. Rotate.
2. Stretch.
3. Rotate again.

Every linear transformation can be understood through these three geometric actions.

This project exists to make that idea visible.
