# 3D Printing Price Calculator

Local PHP-peso quotation calculator for PETG prints made on an Elegoo Neptune 4.

## Run with Node.js

```text
npm start
```

Open <http://localhost:3000>.

## Run with Docker

```text
docker build -t 3d-printing-calculator .
docker run --rm -p 3000:3000 3d-printing-calculator
```

Or use Docker Compose:

```text
docker compose up --build
```

Open <http://localhost:3006>. Stop it with `docker compose down`.

The app is intentionally client-side: imported G-code is read locally in the browser and no customer or quotation data is uploaded.

Features include OrcaSlicer metadata import, automatic recalculation, quantity-based order pricing, discounts, print quotation, and CSV export.
