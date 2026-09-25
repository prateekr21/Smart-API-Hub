# Smart API Hub

A browser-based API test-case generator built for exploring endpoints, Swagger/OpenAPI contracts, and common edge conditions.

## What it does

- Accepts a custom endpoint
- Loads a Swagger/OpenAPI URL or local JSON contract
- Generates happy-path, validation, auth, and resilience tests
- Lets you filter by type and search cases
- Copies or downloads the generated suite as JSON

## Local preview

1. Open `index.html` directly in a browser, or serve the folder locally.
2. Run:

```bash
python -m http.server 8000
```

Then open http://localhost:8000 in your browser.

## Project files

- `index.html` — app structure and UI
- `styles.css` — visual design and layout
- `app.ts` — TypeScript logic for generating cases
- `app.js` — compiled browser bundle
- `package.json` — build script
- `tsconfig.json` — TypeScript config

## Build

```bash
npm install
npm run build
```

This project runs entirely in the browser and does not require a backend.
