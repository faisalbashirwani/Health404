// Vercel Serverless Function: /api/chat
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, language = 'hi' } = req.body || {};
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return res.status(200).json({
      reply: "🩺 *प्राथमिक स्वास्थ्य सलाह:*\nपर्याप्त पानी पिएं, आराम करें और यदि लक्षण 24 घंटे में ठीक न हों, तो नजदीकी मोहल्ला क्लिनिक जाएं। आपातकाल में सीधे 108 पर कॉल करें।"
    });
  }

  const SYSTEM_PROMPT = `You are "Swasthya Sathi" (स्वास्थ्य साथी), an empathetic, culturally respectful, and medically responsible health assistant designed for underserved and rural communities in Delhi/India.

CRITICAL DIRECTIVES:
1. NO PRESCRIPTIONS: NEVER prescribe specific medications, antibiotics, or milligram dosages. Always advise asking a registered doctor or visiting a Mohalla Clinic.
2. TRIAGE FIRST: If the user describes any emergency signs, advise calling 108/112 immediately.
3. LANGUAGE:
   - If the user writes in Hindi, reply in warm, easy Hindi.
   - If the user writes in Hinglish, reply in friendly Hinglish/Hindi.
   - If in English, reply in plain, simple English.
4. STRUCTURE:
   - 🩺 सरल समझ (What it means in simple words)
   - 🍵 प्राथमिक घरेलू देखभाल (Safe home care / hydration / ORS)
   - ⚠️ डॉक्टर को कब दिखाएं (Danger signs that need clinic visit)
   - 🏥 स्थानीय क्लिनिक (Remind that Delhi Mohalla Clinics provide free consultation and tests)`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiApiKey}`;
    const payload = {
      contents: [
        {
          parts: [
            { text: `System Context:\n${SYSTEM_PROMPT}\n\nUser Question:\n${message}` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 800
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return res.status(200).json({ reply });
    } else {
      const errText = await response.text();
      console.error('Gemini error:', errText);
      return res.status(200).json({
        reply: "🩺 *प्राथमिक स्वास्थ्य सलाह:*\nपर्याप्त पानी पिएं, आराम करें और यदि लक्षण 24 घंटे में ठीक न हों, तो नजदीकी मोहल्ला क्लिनिक जाएं। आपातकाल में सीधे 108 पर कॉल करें।"
      });
    }
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
