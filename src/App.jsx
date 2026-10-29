import React, { useState, useEffect, useRef } from 'react';
import {
  HeartPulse,
  PhoneCall,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  MapPin,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Compass,
  Navigation,
  Info,
  ExternalLink,
  ChevronRight,
  MessageSquare,
  Globe
} from 'lucide-react';

import { checkEmergencyTriage } from './utils/triage';
import { checkHealthMyth, getAllMyths } from './utils/myths';
import { findNearestClinics, findClinicsByQuery, getAllClinics } from './utils/clinics';
import { translations } from './utils/translations';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'myths' | 'clinics' | 'advisory'
  const [lang, setLang] = useState('hi'); // 'hi' | 'en' | 'hinglish'
  const t = translations[lang] || translations.hi;

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: translations.hi.welcomeMsg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Clinic state
  const [userLocation, setUserLocation] = useState(null);
  const [clinicsList, setClinicsList] = useState(findNearestClinics(28.7499, 77.1170, 4));
  const [locatingStatus, setLocatingStatus] = useState('');

  // Myth forward state
  const [mythInput, setMythInput] = useState('');
  const [mythResult, setMythResult] = useState(null);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Update initial welcome message if user changes language and hasn't chatted yet
  const handleLanguageChange = (newLang) => {
    setLang(newLang);
    const newT = translations[newLang] || translations.hi;
    if (messages.length === 1 && messages[0].sender === 'bot') {
      setMessages([
        {
          ...messages[0],
          text: newT.welcomeMsg
        }
      ]);
    }
  };

  // Speech Recognition (Web Speech API) setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = lang === 'en' ? 'en-IN' : 'hi-IN';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        setIsListening(false);
        handleSendQuery(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [lang]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported on this browser. Please use Chrome or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang = lang === 'en' ? 'en-IN' : 'hi-IN';
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Mic start error:', err);
      }
    }
  };

  // Text to Speech
  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const cleanText = text
      .replace(/[*#_`>]/g, '')
      .split('\n')
      .filter(l => l.trim() && !l.startsWith('http'))
      .slice(0, 3)
      .join(' ');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang === 'en' ? 'en-IN' : 'hi-IN';
    utterance.rate = 0.95;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Geolocation Handler
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setLocatingStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lon: longitude });
        const nearby = findNearestClinics(latitude, longitude, 4);
        setClinicsList(nearby);
        setLocatingStatus('success');
      },
      (err) => {
        console.error('GPS error:', err);
        setLocatingStatus('error');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Main Query Handler
  const handleSendQuery = async (queryText) => {
    const text = (queryText || inputMessage).trim();
    if (!text) return;

    setInputMessage('');

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    // 1. Instant Client-Side Emergency Check
    const triage = checkEmergencyTriage(text);
    if (triage.isEmergency) {
      const guidance = lang === 'en' ? triage.alert.guidanceEn : triage.alert.guidanceHi;
      const emergencyReply = {
        id: Date.now() + 1,
        sender: 'bot',
        isEmergency: true,
        text: `${t.emergencyTitle}\n\n${guidance}\n\n${t.emergencyNotice}`,
        helplines: triage.alert.helplines,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, emergencyReply]);
      setIsLoading(false);
      speakText(guidance);
      return;
    }

    // 2. Instant Client-Side Myth Check
    const mythCheck = checkHealthMyth(text);
    if (mythCheck.matched && mythCheck.myth) {
      const m = mythCheck.myth;
      const explanation = lang === 'en' ? m.explanation_en : m.explanation_hi;
      const advice = lang === 'en' ? m.actionable_advice_en : m.actionable_advice_hi;
      const mythReply = {
        id: Date.now() + 1,
        sender: 'bot',
        isMyth: true,
        mythData: m,
        text: `🔍 *${t.tabMyths} (Fact Check)*\n\n📌 *${t.claimedForward}* "${m.claim_summary}"\n\n🚦 *${t.verdictHeader}:* ${m.verdict_label}\n\n📖 *${t.medicalReality}* ${explanation}\n\n💡 *${lang === 'en' ? 'Advice:' : 'सलाह:'}* ${advice}\n\n${t.forwardReplyTitle} "${m.forward_reply}"`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, mythReply]);
      setIsLoading(false);
      speakText(explanation);
      return;
    }

    // 3. Clinic Query Check
    const lower = text.toLowerCase();
    if (['clinic', 'hospital', 'aspatal', 'doctor', 'kahan', 'paas', 'near'].some(k => lower.includes(k))) {
      const { matchedLocation, clinics } = findClinicsByQuery(text, 3);
      const clinicReply = {
        id: Date.now() + 1,
        sender: 'bot',
        isClinic: true,
        locationName: matchedLocation,
        clinics: clinics,
        text: `🏥 *${matchedLocation} - ${t.nearbyFacilities}*\n\n` +
          clinics.map((c, i) => `${i + 1}. *${c.name}* (~${c.distanceKm} km)\n   • ${t.address || 'Address'}: ${c.address}\n   • ${t.servicesAvailable || 'Services'}: ${c.services}`).join('\n\n') +
          `\n\n💡 ${t.clinicsTabDesc}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, clinicReply]);
      setIsLoading(false);
      return;
    }

    // 4. General Query -> Gemini API via /api/chat or client fallback
    try {
      let botResponseText = '';
      let apiSuccess = false;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, language: lang })
        });
        if (response.ok) {
          const data = await response.json();
          botResponseText = data.reply;
          apiSuccess = true;
        }
      } catch (e) {
        // Local dev without serverless api
      }

      // If /api/chat is not available (e.g. during local npm run dev), call Gemini directly with VITE key
      if (!apiSuccess && import.meta.env.VITE_GEMINI_API_KEY) {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
        const targetLanguage = lang === 'en' ? 'simple English' : (lang === 'hinglish' ? 'friendly Hinglish' : 'simple Hindi');
        const payload = {
          contents: [{ parts: [{ text: `You are Swasthya Sathi, a health assistant in India. Do not prescribe specific medications. Triage first. Reply in ${targetLanguage}:\nUser question: ${text}` }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 800 }
        };
        const geminiRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (geminiRes.ok) {
          const data = await geminiRes.json();
          botResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          apiSuccess = true;
        }
      }

      if (!botResponseText) throw new Error('Could not get response');

      const botReply = {
        id: Date.now() + 1,
        sender: 'bot',
        text: botResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botReply]);
      speakText(botResponseText);
    } catch (err) {
      console.warn('Backend API fallback triggered:', err);
      let fallbackText = lang === 'en'
        ? "🩺 *Health Guidance:*\n\nDrink plenty of fluids, rest, and monitor your symptoms. If symptoms persist beyond 24 hours or worsen, please consult a qualified doctor at your nearest primary health center. For emergencies, call 108 immediately."
        : "🩺 *स्वास्थ्य साथी मार्गदर्शन:*\n\nपर्याप्त पानी पिएं, ओआरएस लें और आराम करें। यदि लक्षण 24 घंटे में ठीक न हों या बढ़ें, तो नजदीकी मोहल्ला क्लिनिक या सरकारी अस्पताल में डॉक्टर को दिखाएं। आपातकाल में सीधे 108 पर कॉल करें।";

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      speakText(fallbackText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleMythSubmit = (e) => {
    e.preventDefault();
    if (!mythInput.trim()) return;

    const result = checkHealthMyth(mythInput);
    if (result.matched && result.myth) {
      setMythResult(result.myth);
    } else {
      setMythResult({
        unmatched: true,
        claim_summary: mythInput,
        verdict_label: lang === 'en' ? "⚪ UNVERIFIED / PROCEED WITH CAUTION" : "⚪ UNVERIFIED CLAIM / सावधानी बरतें",
        explanation_hi: "यह नुस्खा हमारे सत्यापित चिकित्सा डेटाबेस में नहीं मिला। बिना वैज्ञानिक प्रमाण के किसी भी व्हाट्सएप फॉरवर्ड पर विश्वास न करें और गंभीर बीमारी में केवल योग्य डॉक्टर की सलाह लें।",
        explanation_en: "This claim is not in our verified medical database. Do not rely on unverified online forwards for medical treatments without consulting a doctor.",
        forward_reply: lang === 'en' 
          ? "⚠️ This health remedy is unverified. Relying on rumours can delay critical medical care. Please consult a doctor."
          : "⚠️ यह स्वास्थ्य नुस्खा अप्रमाणित है। गलत इलाज से बीमारी बढ़ सकती है, इसलिए कृपया डॉक्टर से सलाह लें।"
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 max-w-xl mx-auto shadow-2xl relative font-sans border-x border-slate-200">
      {/* 1. TOP SOS EMERGENCY BANNER */}
      <div className="bg-rose-600 text-white px-3 py-2 flex items-center justify-between text-xs sm:text-sm font-medium shadow-md z-30">
        <div className="flex items-center space-x-1.5 font-bold tracking-wide">
          <ShieldAlert className="w-4 h-4 animate-pulse text-amber-300" />
          <span>{t.sosLabel}</span>
        </div>
        <div className="flex items-center space-x-2">
          <a
            href="tel:108"
            className="bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-full flex items-center space-x-1 transition font-bold"
          >
            <PhoneCall className="w-3.5 h-3.5 text-amber-300" />
            <span>{t.ambulanceBtn}</span>
          </a>
          <a
            href="tel:112"
            className="bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-full flex items-center space-x-1 transition font-bold"
          >
            <PhoneCall className="w-3.5 h-3.5 text-amber-300" />
            <span>{t.policeBtn}</span>
          </a>
        </div>
      </div>

      {/* 2. HEADER */}
      <header className="bg-emerald-700 text-white p-3.5 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-full bg-emerald-500/30 flex items-center justify-center border border-emerald-300/40">
            <HeartPulse className="w-6 h-6 text-emerald-100" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight tracking-wide">
              {t.appName}
            </h1>
            <p className="text-xs text-emerald-100/90">{t.appSubtitle}</p>
          </div>
        </div>

        {/* Language selector dropdown */}
        <div className="flex items-center gap-1.5">
          <Globe className="w-4 h-4 text-emerald-200 shrink-0" />
          <select
            value={lang}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="text-xs bg-emerald-800 text-white font-semibold border border-emerald-500/60 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-300 cursor-pointer shadow-inner"
            title="Choose Language / भाषा चुनें"
          >
            <option value="hi" className="bg-slate-900 text-white">🇮🇳 हिन्दी (Hindi)</option>
            <option value="en" className="bg-slate-900 text-white">🇬🇧 English</option>
            <option value="hinglish" className="bg-slate-900 text-white">💬 Hinglish</option>
          </select>
        </div>
      </header>

      {/* 3. NAVIGATION TABS */}
      <div className="bg-white border-b border-slate-200 grid grid-cols-4 text-center text-xs font-semibold text-slate-600 shadow-sm z-20">
        <button
          onClick={() => setActiveTab('chat')}
          className={`py-3 flex flex-col items-center justify-center gap-1 transition ${
            activeTab === 'chat'
              ? 'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50/50 font-bold'
              : 'hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>{t.tabChat}</span>
        </button>

        <button
          onClick={() => setActiveTab('myths')}
          className={`py-3 flex flex-col items-center justify-center gap-1 transition ${
            activeTab === 'myths'
              ? 'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50/50 font-bold'
              : 'hover:text-slate-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>{t.tabMyths}</span>
        </button>

        <button
          onClick={() => setActiveTab('clinics')}
          className={`py-3 flex flex-col items-center justify-center gap-1 transition ${
            activeTab === 'clinics'
              ? 'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50/50 font-bold'
              : 'hover:text-slate-900'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>{t.tabClinics}</span>
        </button>

        <button
          onClick={() => setActiveTab('advisory')}
          className={`py-3 flex flex-col items-center justify-center gap-1 transition ${
            activeTab === 'advisory'
              ? 'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50/50 font-bold'
              : 'hover:text-slate-900'
          }`}
        >
          <Info className="w-4 h-4" />
          <span>{t.tabAdvisory}</span>
        </button>
      </div>

      {/* 4. MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* TAB 1: INTERACTIVE HEALTH CHAT */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full space-y-3 pb-24">
            {/* Quick Prompts Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs no-scrollbar">
              <span className="text-slate-400 text-[11px] whitespace-nowrap font-medium">{t.suggestionsLabel}</span>
              <button
                onClick={() => handleSendQuery(lang === 'en' ? 'I have had fever and body ache for 2 days, what should I do?' : '2 दिन से तेज बुखार है, क्या करूं?')}
                className="bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-full whitespace-nowrap hover:bg-emerald-50 hover:border-emerald-300 transition"
              >
                {t.suggFever}
              </button>
              <button
                onClick={() => handleSendQuery(lang === 'en' ? 'Does drinking papaya leaf juice cure dengue?' : 'क्या पपीते का पत्ता डेंगू ठीक करता है?')}
                className="bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-full whitespace-nowrap hover:bg-emerald-50 hover:border-emerald-300 transition"
              >
                {t.suggDengue}
              </button>
              <button
                onClick={() => handleSendQuery(lang === 'en' ? 'Where are clinics near Rohini / DTU?' : 'रोहिणी के पास मोहल्ला क्लिनिक कहाँ है?')}
                className="bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-full whitespace-nowrap hover:bg-emerald-50 hover:border-emerald-300 transition"
              >
                {t.suggClinics}
              </button>
              <button
                onClick={() => handleSendQuery(lang === 'en' ? 'Severe chest pain radiating to arm with heavy sweating' : 'सीने में बहुत तेज दर्द और पसीना आ रहा है')}
                className="bg-rose-50 border border-rose-200 text-rose-700 px-2.5 py-1 rounded-full whitespace-nowrap hover:bg-rose-100 transition font-medium"
              >
                {t.suggEmergency}
              </button>
            </div>

            {/* Chat Messages */}
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3.5 shadow-sm text-sm sm:text-base leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-emerald-600 text-white rounded-tr-none'
                        : msg.isEmergency
                        ? 'bg-rose-50 border-2 border-rose-500 text-rose-950 rounded-tl-none font-medium'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                    }`}
                  >
                    {/* Render message with basic line breaks */}
                    <div className="whitespace-pre-line">{msg.text}</div>

                    {/* Helplines for emergency card */}
                    {msg.isEmergency && msg.helplines && (
                      <div className="mt-3 pt-2.5 border-t border-rose-200 space-y-1.5">
                        <div className="text-xs font-bold text-rose-800 uppercase tracking-wide">
                          {t.callNow}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <a
                            href="tel:108"
                            className="bg-rose-600 text-white py-1.5 px-3 rounded-lg text-center font-bold flex items-center justify-center gap-1 shadow"
                          >
                            <PhoneCall className="w-3.5 h-3.5" /> {t.call108}
                          </a>
                          <a
                            href="tel:112"
                            className="bg-slate-800 text-white py-1.5 px-3 rounded-lg text-center font-bold flex items-center justify-center gap-1 shadow"
                          >
                            <PhoneCall className="w-3.5 h-3.5" /> {t.call112}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Forward reply copy action for myth message */}
                    {msg.isMyth && msg.mythData && (
                      <div className="mt-3 pt-2 border-t border-slate-200">
                        <button
                          onClick={() => handleCopyText(msg.mythData.forward_reply, msg.id)}
                          className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 border border-emerald-200 transition"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{t.copiedReply}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>{t.copyWhatsAppReply}</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    <div
                      className={`text-[10px] mt-1.5 flex items-center justify-end gap-1 ${
                        msg.sender === 'user' ? 'text-emerald-100' : 'text-slate-400'
                      }`}
                    >
                      {msg.sender === 'bot' && (
                        <button
                          onClick={() => speakText(msg.text)}
                          className="hover:text-emerald-600 p-0.5"
                          title={t.listenAudioTitle}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center space-x-2 text-slate-500 text-xs italic bg-white p-3 rounded-2xl w-fit border border-slate-200">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>{t.thinkingMsg}</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* TAB 2: WHATSAPP FORWARD MYTH CHECKER */}
        {activeTab === 'myths' && (
          <div className="space-y-4 pb-12">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-base mb-1">
                <ShieldAlert className="w-5 h-5 text-emerald-600" />
                <h3>{t.mythTabTitle}</h3>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                {t.mythTabDesc}
              </p>

              <form onSubmit={handleMythSubmit} className="space-y-2.5">
                <textarea
                  rows={3}
                  value={mythInput}
                  onChange={(e) => setMythInput(e.target.value)}
                  placeholder={t.mythPlaceholder}
                  className="w-full text-xs sm:text-sm p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 resize-none"
                />
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow transition flex items-center justify-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>{t.verifyBtn}</span>
                </button>
              </form>
            </div>

            {/* Verdict Display */}
            {mythResult && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-md space-y-3 animate-fade-in">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{t.verdictHeader}</span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    {mythResult.verdict_label}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase">{t.claimedForward}</h4>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">"{mythResult.claim_summary}"</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-emerald-800 uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {t.medicalReality}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-700 mt-1 leading-relaxed">
                    {lang === 'en' ? mythResult.explanation_en : mythResult.explanation_hi}
                  </p>
                </div>

                {mythResult.forward_reply && (
                  <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                    <h4 className="text-xs font-bold text-emerald-900 uppercase">
                      {t.forwardReplyTitle}
                    </h4>
                    <p className="text-xs text-emerald-950 mt-1 italic">
                      "{mythResult.forward_reply}"
                    </p>
                    <button
                      onClick={() => handleCopyText(mythResult.forward_reply, 'myth_res')}
                      className="mt-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1 transition"
                    >
                      {copiedId === 'myth_res' ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> {t.copiedReply}
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> {t.copyWhatsAppReply}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Popular Indian Myths Pre-loaded */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider px-1">
                {t.popularMythsTitle}
              </h4>
              <div className="grid gap-2">
                {getAllMyths().slice(0, 4).map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      setMythInput(m.claim_summary);
                      setMythResult(m);
                    }}
                    className="bg-white p-3 rounded-xl border border-slate-200 hover:border-emerald-400 cursor-pointer transition shadow-sm flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800 line-clamp-1">{m.claim_summary}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{m.verdict_label}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: NEARBY CLINIC LOCATOR */}
        {activeTab === 'clinics' && (
          <div className="space-y-4 pb-12">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center space-y-2.5">
              <MapPin className="w-8 h-8 text-emerald-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">{t.clinicsTabTitle}</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                {t.clinicsTabDesc}
              </p>

              <button
                onClick={handleDetectLocation}
                disabled={locatingStatus === 'locating'}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow flex items-center justify-center gap-2 transition"
              >
                <Navigation className={`w-4 h-4 ${locatingStatus === 'locating' ? 'animate-spin' : ''}`} />
                <span>
                  {locatingStatus === 'locating'
                    ? t.gpsLocating
                    : t.gpsBtn}
                </span>
              </button>

              {locatingStatus === 'success' && (
                <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 py-1 px-2 rounded-lg">
                  {t.gpsSuccess}
                </div>
              )}
            </div>

            {/* List of clinics */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider px-1">
                {t.nearbyFacilities}
              </h4>

              {clinicsList.map((c, i) => (
                <div
                  key={c.id || i}
                  className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2 hover:border-emerald-300 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{c.name}</h4>
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 bg-emerald-100 text-emerald-900 border border-emerald-300">
                        {c.type}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg shrink-0">
                      ~{c.distanceKm || c.calculated_distance_km} km
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-snug">
                    📍 {c.address}
                  </p>

                  <div className="text-xs text-slate-700 bg-slate-50 p-2 rounded-xl">
                    🩺 <strong>{t.servicesAvailable}</strong> {c.services}
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <a
                      href={`tel:${c.contact}`}
                      className="text-slate-700 hover:text-emerald-700 font-medium flex items-center gap-1"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{c.contact}</span>
                    </a>
                    <a
                      href={c.directionsUrl || `https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 shadow-sm transition"
                    >
                      <span>{t.getDirections}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: DELHI HEALTH ADVISORY */}
        {activeTab === 'advisory' && (
          <div className="space-y-4 pb-12">
            <div className="bg-gradient-to-r from-amber-600 to-rose-600 text-white p-4 rounded-2xl shadow-md space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                {t.advisoryBadge}
              </span>
              <h3 className="text-base font-bold">{t.advisoryTitle}</h3>
              <p className="text-xs text-white/90">
                {t.advisoryDesc}
              </p>
            </div>

            {/* Smog & AQI card */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <span className="text-xl">🌫️</span>
                <h4>{t.smogTitle}</h4>
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                {t.smogPoints.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>

            {/* Dengue & Monsoon card */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <span className="text-xl">🦟</span>
                <h4>{t.dengueTitle}</h4>
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                {t.denguePoints.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>

            {/* Free Mohalla Clinic guide */}
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <span className="text-xl">🏥</span>
                <h4>{t.mohallaTitle}</h4>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed whitespace-pre-line">
                {t.mohallaDesc}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* 5. BOTTOM INPUT BAR (Only on Chat tab) */}
      {activeTab === 'chat' && (
        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-2.5 shadow-lg z-30">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery();
            }}
            className="flex items-center gap-1.5"
          >
            {/* Mic voice button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`p-3 rounded-full transition flex items-center justify-center shrink-0 ${
                isListening
                  ? 'bg-rose-600 text-white mic-recording shadow-lg'
                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              }`}
              title={lang === 'en' ? 'Speak (Voice Input)' : 'बोलकर पूछें (वॉइस नोट)'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Text input */}
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={isListening ? t.listeningStatus : t.inputPlaceholder}
              className="flex-1 bg-slate-100 border border-slate-200 rounded-full px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white p-2.5 rounded-full transition shrink-0 shadow"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
