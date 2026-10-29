# 🚀 Swasthya Sathi Web App Deployment Guide
### Host on Vercel with Custom Subdomain `health.faisalwani.me`

This web app is built with **Vite, React, Tailwind CSS**, and a **Vercel Serverless Function (`/api/chat`)** that secures your Google Gemini API key.

---

## 💻 1. Local Testing (Right Now)

Run the local development server:
```powershell
cd c:\Users\faisa\Faisal_codes\projects\health-assistant\web
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

*Features to test locally:*
- 🎙️ **Microphone:** Click the green mic button and speak in Hindi or English (uses native Web Speech API).
- 🔊 **Voice Readout:** Click the speaker icon next to any bot reply to listen out loud.
- 📍 **Nearby Clinics:** Click "📍 अपनी लाइव लोकेशन शेयर करें" to find Mohalla clinics near you.
- 🛡️ **Myth-Buster:** Paste *"kya papita dengue theek karta hai"* or select any pre-loaded myth.

---

## 🌐 2. Deploying to Vercel (Free & Instant)

### Method A: Via GitHub (Recommended)
1. Initialize a git repository in the `web` folder (or whole project):
   ```bash
   cd c:\Users\faisa\Faisal_codes\projects\health-assistant\web
   git init
   git add .
   git commit -m "feat: Swasthya Sathi Web App for DTU Hackathon"
   ```
2. Create a new repository on GitHub (e.g. `swasthya-sathi`) and push:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/swasthya-sathi.git
   git branch -M main
   git push -u origin main
   ```
3. Go to [Vercel](https://vercel.com/) $\rightarrow$ Click **"Add New Project"** $\rightarrow$ Import your GitHub repository.
4. In the **Environment Variables** section on Vercel, add:
   * **Key:** `GEMINI_API_KEY`
   * **Value:** `your_gemini_api_key_here`
5. Click **"Deploy"**! You will get an instant live URL like `swasthya-sathi.vercel.app`.

---

### Method B: Via Vercel CLI (1-Command Direct Deploy)
```powershell
cd c:\Users\faisa\Faisal_codes\projects\health-assistant\web
npx vercel --prod
```
*Follow the interactive prompts to link your Vercel account.*

---

## 🔗 3. Connecting to your Domain: `health.faisalwani.me`

Once deployed on Vercel:
1. In your Vercel project dashboard, go to **Settings** $\rightarrow$ **Domains**.
2. Type `health.faisalwani.me` and click **Add**.
3. Vercel will show the required DNS record:
   * **Record Type:** `CNAME`
   * **Name / Host:** `health`
   * **Value / Points to:** `cname.vercel-dns.com`
4. Log into your domain DNS manager (Cloudflare, GoDaddy, Namecheap, etc. where `faisalwani.me` is registered):
   * Add that CNAME record.
   * If using **Cloudflare**, make sure the proxy status is set to *DNS only* (gray cloud) or standard proxied.
5. Within 2–5 minutes, your custom domain `https://health.faisalwani.me` will be live with a free automatic SSL/HTTPS certificate!

---

## 🎯 4. Demo QR Code for DTU Judges

Once deployed to `https://health.faisalwani.me` (or `swasthya-sathi.vercel.app`):
1. Go to any free QR code generator (e.g. [qr-code-generator.com](https://www.qr-code-generator.com/)).
2. Generate a QR code for your live link.
3. Put the QR code on the final slide of your hackathon presentation.
4. Have the DTU judges scan it with their phone camera to try the voice notes and clinic finder live!
