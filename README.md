# 📱 Swasthya Sathi Web App
### *Mobile-First Multilingual Health PWA*

Built for deployment on **Vercel** with custom domain **[health.faisalwani.me](https://health.faisalwani.me)**.

---

## ⚡ Quick Start

```powershell
# Install dependencies (already completed)
npm install

# Run local development server
npm run dev

# Build for production
npm run build
```

---

## 🛠️ Stack & Architecture
- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS (Mobile-first, responsive, accessible contrast)
- **Icons:** Lucide React
- **AI Engine:** Google Gemini 3.5 Flash Lite via `/api/chat` Vercel Serverless Function
- **Voice In:** Web Speech API (`SpeechRecognition` in Hindi / English)
- **Voice Out:** Web Speech API (`SpeechSynthesis` in Hindi / English)
- **Geolocation:** Browser Geolocation API + Haversine Distance Matcher for Delhi Mohalla Clinics

---

## 🚀 Vercel Deployment & Custom Subdomain
See [`DEPLOY.md`](DEPLOY.md) for full step-by-step instructions on setting up DNS CNAME records for `health.faisalwani.me`.
