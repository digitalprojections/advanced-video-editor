
# Gemini Resolve - Production Deployment Guide

**Credits:** @ahmadfuzal  
**Date:** 2024-05-24

## 1. Google OAuth Troubleshooting
If you see the error `flowName=GeneralOAuthFlow`:
- It means your Google Cloud Console **Authorized JavaScript Origins** do not match your current hosting URL.
- Open your [Google Cloud Console](https://console.cloud.google.com/).
- Go to **APIs & Services > Credentials**.
- Edit your **OAuth 2.0 Client ID**.
- Under **Authorized JavaScript origins**, add your EXACT origin (e.g., `https://my-app.vercel.app` or `http://localhost:3000`).
- **Note**: It can take 5-10 minutes for Google's servers to update. Use the "Developer Bypass" in the app during this time.

## 2. COOP/COEP Headers
**CRITICAL** for FFmpeg.wasm:
Your web server **must** provide the following cross-origin isolation headers:
- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Opener-Policy: same-origin`

If these headers are missing, FFmpeg will fail to load or throw `SharedArrayBuffer` errors.

## 3. Hosting Recommendations
- **Vercel**: Add these headers in `vercel.json`.
- **Netlify**: Add them in `_headers`.

## 4. Performance
Rendering happens entirely on the client's CPU via WASM. Large videos (4K) may crash the browser tab if RAM is insufficient (>4GB recommended).
