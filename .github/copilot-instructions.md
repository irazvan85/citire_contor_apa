# Citire Contoare Apă – Project Guidelines

## Overview

Web app for reading residential water meter values at "Ripensia 21". The UI, styles, and browser logic live in `index.html`; `api/ocrskill.js` is a Vercel serverless proxy for OCRSkill. Uses OCR (Tesseract.js) and AI vision APIs (Claude, OpenAI GPT-4o, Gemini, OCRSkill) to extract meter index and serial number from photos. Deployed on Vercel. UI language is **Romanian**.

## Architecture

- **Browser app**: HTML, CSS, and client-side JS live in `index.html`. No build step or bundler.
- **OCRSkill backend**: `api/ocrskill.js` forwards image bytes to OCRSkill using the server-only `OCRSKILL_API_KEY` environment variable. `vercel.json` routes `/api/*` to functions and serves the app for other paths.
- **Three meters**: `bucatarie`, `baia-mare`, `baia-mica` — each has its own camera/file/overlay/reading UI.
- **OCR engines**: Tesseract.js (local, no key), Claude (`api.anthropic.com`), OpenAI GPT-4o, Gemini Flash 1.5, and OCRSkill (Vercel function). Direct-provider keys are stored in `localStorage`; OCRSkill's key is stored only in Vercel environment configuration.
- **History**: stored in `localStorage`, visualised with Chart.js.

## Code Conventions

- Pure vanilla JS — no frameworks. Use `document.getElementById` / DOM APIs directly.
- CSS uses custom properties defined in `:root` — always use `var(--token)`, never hard-code colors.
- Meter IDs follow kebab-case: `bucatarie`, `baia-mare`, `baia-mica`. Element IDs are prefixed: `val-{meter}`, `serie-{meter}`, `ov-idx-{meter}`, etc.
- Romanian labels in the UI. Keep all user-facing strings in Romanian.
- Fonts: `'Syne'` for headings/buttons, `'DM Mono'` for numeric/code values.

## Security

- API keys must never be logged or embedded in the HTML at rest. Direct-provider keys are sent only to their respective providers; the OCRSkill key stays server-side and is used only by `api/ocrskill.js`.
- The CSP in `vercel.json` allows `connect-src` only to required endpoints. For a browser-called provider, add its domain; same-origin serverless endpoints need no external browser connection.
- Camera access is governed by `Permissions-Policy: camera=(self)` — do not request camera on cross-origin frames.
- All OCR/AI responses must be sanitised before inserting into the DOM (use `.textContent` / `.value`, not `.innerHTML`).

## Deployment

No build step — push to `main`, Vercel deploys automatically. Test locally by opening `index.html` directly in a browser or with `npx serve .`.
