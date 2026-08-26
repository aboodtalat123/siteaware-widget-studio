# SiteAware Widget Studio

Standalone local studio for designing, previewing, and testing SiteAware widget themes.

This project now includes:

- Arabic and English UI
- Light and dark appearance toggle
- Dedicated icon-shape and chat-shape picker cards
- A Gemini backend proxy for live replies
- Render config for deployment from GitHub

## Studio

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

If `GEMINI_API_KEY` is set in your environment, the chat preview will call the live Gemini backend. If not, the UI falls back to a local preview response and shows the backend status in the preview toolbar.

## Build

```bash
npm run build
```

That produces:

```text
C:\Users\UNRWA\Desktop\siteaware-widget-studio\dist
```

The unpacked extension is copied to:

```text
C:\Users\UNRWA\Desktop\siteaware-widget-studio\dist\extension
```

## Load Extension

Load the unpacked extension in Chrome or Chromium:

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select `C:\Users\UNRWA\Desktop\siteaware-widget-studio\dist\extension`

## Gemini Setup

Create a local `.env` file from `.env.example` and add your key:

```text
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.7-flash
GEMINI_FALLBACK_MODEL=gemini-3.6-flash
```

When the primary model is temporarily overloaded or rate-limited, the server automatically retries with the fallback model.

## Render

This repo includes `render.yaml` for a single Node web service.

- Build command: `npm run build`
- Start command: `npm start`

## GitHub

Push this repository to GitHub, then connect the GitHub repo in Render so deploys happen on each push.

## Extension workflow

1. Open any website
2. Click the SiteAware Preview extension icon
3. The side panel opens
4. Click `Scan This Page`
5. Click `Brand Match`, `High Contrast`, or `Premium`
6. Click `Inject Widget`
7. Click `Pick Target` to select a target element
8. Use `Demo Profiles` to preview deterministic sample sites
9. Click `Clear Target` or `Remove Widget` to clean up

## Notes

- Backend is optional, but when `GEMINI_API_KEY` is set the studio uses Gemini for live replies.
- No database
- No SiteAware core changes
- No files outside this repo
