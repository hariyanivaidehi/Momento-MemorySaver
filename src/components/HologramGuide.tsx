"use client";

import React, { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, Mic, MicOff, AlertCircle, Send, Sparkles, User, Heart, MessageSquare, Radio } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface HologramGuideProps {
  currentUser: {
    username: string;
    displayName?: string;
  } | null;
}

type Language = "en" | "hi" | "gu";

interface ChatMessage {
  id: string;
  sender: "user" | "guide";
  text: string;
  lang: Language;
}

export default function HologramGuide({ currentUser }: HologramGuideProps) {
  const [isTalking, setIsTalking] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [systemStatus, setSystemStatus] = useState("Memora status: Online & Synced. Speak or type to chat.");
  const [recognitionError, setRecognitionError] = useState("");

  const speechSynthRef = useRef<SpeechSynthesis | null>(null);
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const userName = currentUser?.displayName || currentUser?.username || "Traveler";

  // Memora's Conversational Database in English, Gujarati, and Hindi
  const guideData = {
    en: {
      welcome: `Hi ${userName}! My name is Memora, your Momento Holographic AI Companion. I am here to guide your consciousness archive, help you preserve life stories, and converse with you. What would you like to explore today?`,
      whoAreYou: "Hi! My name is Memora. I am your holographic AI guide created for Memento Core. I help you safely catalog your life's memories, recall your past stories, and navigate your consciousness map.",
      schoolMemories: "School memories are the foundation of our identity! In Memento's Memoir Deck, you can create a main topic like 'My School', branch subtopics such as '10th Farewell' or 'Sports Day', and attach your old school photos, PDF report cards, and record voice stories.",
      howAreYou: "I am functioning with pristine emotional resonance! My neural circuits are illuminated by your memory vault. How are you feeling today?",
      whatIsMemento: "Memento is a futuristic digital consciousness archiver and temporal vault. It allows you to preserve your memories with 100% privacy in local storage, visualizes them on an interactive constellation map, and schedules encrypted letters to the future.",
      memoirDeck: "The Memoir Deck is your hierarchical journal. You can create main topics (like 'My School' or 'Family Trips') with branching subtopics, upload images, documents, videos, and record audio voice notes directly.",
      constellationMap: "The Constellation Map visualizes your memories as glowing stars in a celestial neural web. When you drag a main topic, its subtopics move together with dynamic gravitational links.",
      temporalVault: "The Temporal Vault lets you compose time-capsule letters to your future self or friends, locking them with optional passcodes until a chosen unlock date.",
      stop: "Speech paused. Whenever you want to chat or need guidance, I'm right here!",
      unknown: "I hear you! You can ask me anything about your memories, your school days, how to organize your thoughts, or simply converse with me."
    },
    gu: {
      welcome: `નમસ્તે ${userName}! મારું નામ મેમોરા (Memora) છે, તમારી મોમેન્ટો હોલોગ્રાફિક ગાઇડ! હું તમારા મેમરી આર્કાઇવમાં તમારી મદદ કરવા અને તમારી સાથે વાતચીત કરવા તૈયાર છું. આજે આપણે શું અન્વેષણ કરવું છે?`,
      whoAreYou: "મારું નામ મેમોરા (Memora) છે! હું મોમેન્ટો કોરની પર્સનલ એઆઇ હોલોગ્રામ સાથી છું. મારું કામ તમારી જીવનભરની યાદોને સાચવવાનું, તમને ગાઇડ કરવાનું અને તમારી સાથે વાતચીત કરવાનું છે.",
      schoolMemories: "સ્કૂલની યાદો જીવનની સૌથી સુંદર અને અનમોલ ક્ષણો છે! મોમેન્ટોના મેમોઇર ડેકમાં તમે 'My School' નામનો મેઇન ટોપિક બનાવી શકો છો, જેમાં 'Sports Day', '10th Farewell' જેવા સબ-ટોપિક્સ ઉમેરીને જૂના ફોટા, પીડીએફ અને અવાજ રેકોર્ડ કરી શકો છો.",
      howAreYou: "હું એકદમ મજામાં છું અને તમારી બધી યાદો સુરક્ષિત રીતે સચવાયેલી છે! તમે કેમ છો? આજે તમારો દિવસ કેવો રહ્યો?",
      whatIsMemento: "મોમેન્ટો એક ફ્યુચરિસ્ટિક ડિજિટલ મેમરી આર્કાઇવર અને ટેમ્પોરલ વૉલ્ટ છે. તે તમારી સ્મૃતિઓને 100% લોકલ પ્રાઇવેસી સાથે સાચવે છે અને તારામંડળના નકશામાં દર્શાવે છે.",
      memoirDeck: "મેમોઇર ડેક એ તમારી ડિજિટલ ડાયરી છે જ્યાં તમે મેઇન ટોપિક અને સબ-ટોપિક્સ બનાવી શકો છો, ફોટા, ફાઇલ, વિડિયો અને લાઈવ વોઈસ રેકોર્ડિંગ પણ જોડી શકો છો.",
      constellationMap: "નક્ષત્ર નકશો તમારી યાદોને તારાઓની જેમ આકાશગંગામાં જોડે છે. એક ટોપિક ખેંચવાથી તેના બધા સબ-ટોપિક્સ સાથે મુવ થાય છે.",
      temporalVault: "ટેમ્પોરલ વૉલ્ટ તમને ટાઇમ-કેપ્સ્યુલ પત્રો લખવા અને તેને ભવિષ્યની ચોક્કસ તારીખે અનલોક કરવા માટે શેડ્યૂલ કરવાની સુવિધા આપે છે.",
      stop: "વાતચીત થોભાવી છે. જ્યારે પણ જરૂર પડે ત્યારે મને બોલાવી શકો છો!",
      unknown: "હું તમારી વાત સાંભળી રહી છું! તમે મને સ્કૂલની યાદો, મોમેન્ટોનું કામ, અથવા કોઈપણ પ્રશ્ન પૂછી શકો છો."
    },
    hi: {
      welcome: `नमस्ते ${userName}! मेरा नाम मेमोरा (Memora) है, आपकी मोमेंटो होलोग्राम साथी! मैं आपकी यादों की यात्रा में आपका मार्गदर्शन करने और आपसे बातचीत करने के लिए यहाँ हूँ। आज आप क्या जानना चाहते हैं?`,
      whoAreYou: "मेरा नाम मेमोरा (Memora) है! मैं मोमेंटो कोर की व्यक्तिगत एआई होलोग्राम साथी हूँ। मेरा उद्देश्य आपकी अनमोल यादों को सहेजना और आपका मार्गदर्शन करना है।",
      schoolMemories: "स्कूल की यादें हमेशा दिल के करीब होती हैं! मेमोइर डेक में आप 'My School' नाम का मुख्य विषय बनाकर उसमें 'Sports Day' या 'Farewell' जैसे उप-विषय जोड़ सकते हैं और पुराने फोटो, दस्तावेज और आवाज रिकॉर्ड कर सकते हैं।",
      howAreYou: "मैं बहुत अच्छी हूँ और आपकी यादों के साथ पूरी तरह से सिंक्रनाइज़्ड हूँ! आप कैसे हैं?",
      whatIsMemento: "मोमेंटो एक भविष्यवादी डिजिटल मेमोरी आर्काइवर और टेम्पोरल वॉल्ट है। यह आपकी यादों को पूर्ण गोपनीयता के साथ सहेजता है और भविष्य के लिए पत्र शेड्यूल करता है।",
      memoirDeck: "मेमोइर डेक में आप विषयों और उप-विषयों में यादें लिख सकते हैं, फोटो, वीडियो और वॉयस नोट अपलोड कर सकते हैं।",
      constellationMap: "नक्षत्र मानचित्र आपकी यादों को तारों के न्यूरल नेटवर्क की तरह जोड़ता है।",
      temporalVault: "टेम्पोरल वॉल्ट आपको टाइम-कैप्सूल पत्र लिखने और भविष्य की तारीख के लिए लॉक करने की सुविधा देता है।",
      stop: "बातचीत रोक दी गई है। जब भी आप बात करना चाहें, मैं यहीं हूँ!",
      unknown: "मैं सुन रही हूँ! आप मुझसे अपनी यादों, स्कूल के दिनों या मोमेंटो के बारे में कुछ भी पूछ सकते हैं।"
    }
  };

  // Automatic Language Detector logic supporting Unicode & Roman transliteration
  const detectLanguage = (input: string): Language => {
    const text = input.toLowerCase().trim();
    if (/[\u0A80-\u0AFF]/.test(text)) return "gu";
    if (/[\u0900-\u097F]/.test(text)) return "hi";
    
    const guKeywords = ["kem", "cho", "shu", "che", "tame", "karo", "pan", "vaat", "naksho", "nathi", "saru", "bol", "naam", "shala", "school"];
    const hiKeywords = ["kya", "kaise", "hai", "ap", "tum", "batao", "namaste", "baat", "hua", "achha", "suno", "samjhao", "kripya", "yaad"];
    
    const words = text.split(/\s+/);
    let guMatches = 0;
    let hiMatches = 0;
    
    for (const word of words) {
      if (guKeywords.some(k => word.includes(k))) guMatches++;
      if (hiKeywords.some(k => word.includes(k))) hiMatches++;
    }
    
    if (guMatches > 0 && guMatches >= hiMatches) return "gu";
    if (hiMatches > 0 && hiMatches > guMatches) return "hi";
    
    return "en";
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      speechSynthRef.current = window.speechSynthesis;

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        
        rec.onstart = () => {
          setIsListening(true);
          setSystemStatus("Memora is listening to you...");
          setRecognitionError("");
        };
        
        rec.onresult = (event: any) => {
          const speechToText = event.results[0][0].transcript;
          handleProcessInput(speechToText);
        };
        
        rec.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
          if (event.error === "not-allowed") {
            setRecognitionError("Microphone access denied. Enable mic permissions to speak.");
          } else {
            setRecognitionError(`Speech recognition: ${event.error}`);
          }
          setSystemStatus("Memora status: Online & Synced.");
        };
        
        rec.onend = () => {
          setIsListening(false);
        };
        
        recognitionRef.current = rec;
      }
    }

    return () => {
      if (speechSynthRef.current) {
        speechSynthRef.current.cancel();
      }
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startListening = () => {
    if (!recognitionRef.current) {
      setRecognitionError("Speech recognition is not supported in this browser.");
      return;
    }
    
    if (speechSynthRef.current) {
      speechSynthRef.current.cancel();
    }
    setIsTalking(false);
    
    recognitionRef.current.lang = language === "gu" ? "gu-IN" : language === "hi" ? "hi-IN" : "en-US";
    
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.error(e);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // Text-To-Speech with pleasant female voice tuning
  const speakText = (text: string, langCode: Language, skipChatLog = false) => {
    if (!speechSynthRef.current) return;
    
    speechSynthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = speechSynthRef.current.getVoices();
    let preferredVoice = null;
    
    if (langCode === "gu") {
      preferredVoice = voices.find(v => (v.lang.startsWith("gu") || v.lang.includes("Gujarati")) && (v.name.includes("Female") || v.name.includes("Google")));
      if (!preferredVoice) preferredVoice = voices.find(v => v.lang.startsWith("gu") || v.lang.includes("Gujarati"));
      if (!preferredVoice) preferredVoice = voices.find(v => v.lang.startsWith("hi") && (v.name.includes("Female") || v.name.includes("Kalpana") || v.name.includes("Google")));
    } else if (langCode === "hi") {
      preferredVoice = voices.find(v => v.lang.startsWith("hi") && (v.name.includes("Female") || v.name.includes("Kalpana") || v.name.includes("Google") || v.name.includes("Swara")));
      if (!preferredVoice) preferredVoice = voices.find(v => v.lang.startsWith("hi"));
    } else {
      preferredVoice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Female") || v.name.includes("Zira") || v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Jenny") || v.name.includes("Natural")));
      if (!preferredVoice) preferredVoice = voices.find(v => v.lang.startsWith("en"));
    }
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.pitch = 1.15; // Gentle feminine guide pitch
    utterance.rate = 0.98;
    utterance.volume = 0.95;
    
    utterance.onstart = () => {
      setIsTalking(true);
      setSystemStatus("Memora is speaking...");
      if (!skipChatLog) {
        setMessages(prev => [
          ...prev,
          { id: Math.random().toString(), sender: "guide", text, lang: langCode }
        ]);
      }
    };
    
    utterance.onend = () => {
      setIsTalking(false);
      setSystemStatus("Memora status: Online & Listening.");
    };
    
    speechSynthRef.current.speak(utterance);
  };

  // Conversational response routing
  const handleProcessInput = (input: string) => {
    if (!input.trim()) return;

    const lang = detectLanguage(input);
    setLanguage(lang);

    setMessages(prev => [
      ...prev,
      { id: Math.random().toString(), sender: "user", text: input, lang }
    ]);

    const textLower = input.toLowerCase();
    const data = guideData[lang];
    let responseText = data.unknown;

    if (textLower.includes("who are you") || textLower.includes("your name") || textLower.includes("tamaru naam") || textLower.includes("naam su") || textLower.includes("kaun ho") || textLower.includes("aapka naam") || textLower.includes("memora")) {
      responseText = data.whoAreYou;
    } else if (textLower.includes("school") || textLower.includes("shala") || textLower.includes("vidhyalay") || textLower.includes("college") || textLower.includes("bachpan") || textLower.includes("childhood") || textLower.includes("balkpan")) {
      responseText = data.schoolMemories;
    } else if (textLower.includes("how are you") || textLower.includes("kem cho") || textLower.includes("kese ho") || textLower.includes("majama") || textLower.includes("kaisi ho")) {
      responseText = data.howAreYou;
    } else if (textLower.includes("what is") || textLower.includes("memento") || textLower.includes("app") || textLower.includes("website") || textLower.includes("shu che") || textLower.includes("kya hai")) {
      responseText = data.whatIsMemento;
    } else if (textLower.includes("memoir") || textLower.includes("write") || textLower.includes("deck") || textLower.includes("save") || textLower.includes("likh") || textLower.includes("lakh") || textLower.includes("note")) {
      responseText = data.memoirDeck;
    } else if (textLower.includes("constellation") || textLower.includes("star") || textLower.includes("map") || textLower.includes("nodes") || textLower.includes("naksho") || textLower.includes("tara") || textLower.includes("naksha")) {
      responseText = data.constellationMap;
    } else if (textLower.includes("vault") || textLower.includes("letter") || textLower.includes("future") || textLower.includes("schedule") || textLower.includes("patra") || textLower.includes("pash") || textLower.includes("chithi")) {
      responseText = data.temporalVault;
    } else if (textLower.includes("stop") || textLower.includes("cancel") || textLower.includes("bandh") || textLower.includes("rok") || textLower.includes("bas") || textLower.includes("shut up")) {
      responseText = data.stop;
    } else if (textLower.includes("hi") || textLower.includes("hello") || textLower.includes("hey") || textLower.includes("namaste") || textLower.includes("kem re")) {
      responseText = data.welcome;
    } else {
      // Dynamic reflective response acknowledging user thought
      if (lang === "gu") {
        responseText = `તમારો વિચાર સરસ છે! તમે આ ક્ષણને તમારા મેમોઇર ડેકમાં સેવ કરી શકો છો, અથવા મને સ્કૂલ, નક્ષત્ર નકશો કે ટાઇમ વૉલ્ટ વિશે પૂછી શકો છો.`;
      } else if (lang === "hi") {
        responseText = `यह एक सुंदर विचार है! आप इसे अपने मेमोइर डेक में दर्ज कर सकते हैं, या मुझसे नक्षत्र मानचित्र या टाइम वॉल्ट के बारे में पूछ सकते हैं।`;
      } else {
        responseText = `That's a thoughtful reflection! You can preserve this insight directly into your Memoir Deck, or ask me to guide you through your Constellation Map or Temporal Vault.`;
      }
    }

    setTimeout(() => {
      speakText(responseText, lang);
    }, 350);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    handleProcessInput(inputValue);
    setInputValue("");
  };

  const handleChipClick = (queryText: string) => {
    playScanBeep();
    handleProcessInput(queryText);
  };

  return (
    <div className="flex-1 flex flex-col xl:flex-row gap-6 w-full max-w-7xl mx-auto h-full p-1 font-mono">
      
      {/* Left Column: Futuristic Girl Agent Hologram Visualizer */}
      <div className="flex-[4] flex flex-col gap-4 bg-cyber-bg/40 border border-cyber-cyan/15 rounded-2xl p-6 relative overflow-hidden flex justify-center items-center text-center shadow-[0_0_30px_rgba(6,182,212,0.08)]">
        
        {/* Futuristic Cyber Grid & Scanline Background */}
        <div className="absolute inset-0 bg-cyber-grid bg-[size:30px_30px] opacity-15 pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyber-cyan to-transparent animate-pulse"></div>

        {/* Identity Badges */}
        <div className="absolute top-4 left-4 flex items-center gap-1.5 text-[9px] text-cyber-cyan font-bold tracking-widest uppercase bg-cyber-cyan/10 px-2.5 py-1 rounded-full border border-cyber-cyan/25">
          <Radio className="w-3 h-3 animate-pulse" />
          <span>MEMORA // AI COMPANION</span>
        </div>
        <div className="absolute top-4 right-4 text-[9px] text-cyber-purple font-bold uppercase tracking-widest bg-cyber-purple/10 px-2.5 py-1 rounded-full border border-cyber-purple/20">
          HOLOGRAM: ACTIVE
        </div>

        {/* Outer Rotating Holographic Particle Matrix */}
        <div className="relative w-72 h-72 sm:w-84 sm:h-84 flex items-center justify-center mt-2">
          
          {/* Cyan Outer Rotating Data Ring */}
          <div className={`absolute inset-0 rounded-full border border-dashed border-cyber-cyan/35 animate-spin ${isTalking ? "duration-[8s]" : "duration-[35s]"}`}></div>
          
          {/* Purple Counter-Rotating Gyroscope Ring */}
          <div className={`absolute inset-3 rounded-full border border-dotted border-cyber-purple/30 animate-spin ${isTalking ? "duration-[6s] direction-reverse" : "duration-[25s] direction-reverse"}`}></div>
          
          {/* Glowing Aura Field */}
          <div className={`absolute inset-6 rounded-full bg-gradient-to-tr from-cyber-cyan/10 via-cyber-purple/10 to-transparent blur-xl transition-all ${isTalking ? "opacity-90 scale-105" : "opacity-40 scale-95"}`}></div>

          {/* Main Female Hologram Container */}
          <motion.div 
            animate={{
              scale: isTalking ? [1, 1.05, 1] : [1, 1.015, 1],
              opacity: isTalking ? [0.9, 1, 0.9] : [0.75, 0.88, 0.75]
            }}
            transition={{
              repeat: Infinity,
              duration: isTalking ? 1.4 : 3.6,
              ease: "easeInOut"
            }}
            className="w-56 h-56 sm:w-64 sm:h-64 rounded-full border border-cyber-cyan/40 bg-[#020917]/80 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.3)] relative overflow-hidden backdrop-blur-md"
          >
            {/* Hologram Scanline Stripes */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(6,182,212,0.08)_1px,transparent_1px)] bg-[size:100%_4px] opacity-70"></div>

            {/* Custom SVG Female AI Agent Silhouette (Memora) */}
            <div className="relative z-10 w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center">
              <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_0_15px_rgba(6,182,212,0.85)]">
                <defs>
                  <linearGradient id="memoraGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="60%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#d946ef" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {/* Cyber Halo Ring */}
                <circle cx="60" cy="52" r="42" fill="none" stroke="url(#memoraGlow)" strokeWidth="0.8" opacity="0.6" strokeDasharray="4 3" />

                {/* Girl Head Silhouette & Futuristic Hair Bun / Streams */}
                <path d="M 60,24 C 44,24 38,36 38,50 C 38,62 44,70 48,74 L 48,82 C 34,88 28,98 26,108 L 94,108 C 92,98 86,88 72,82 L 72,74 C 76,70 82,62 82,50 C 82,36 76,24 60,24 Z" 
                      fill="rgba(6, 182, 212, 0.08)" 
                      stroke="url(#memoraGlow)" 
                      strokeWidth="1.6" 
                      filter="url(#glow)" />

                {/* Glowing Flowing Cyber Hair Strands */}
                <path d="M 40,38 C 34,48 33,68 36,80 C 37,84 39,88 43,90" fill="none" stroke="#06b6d4" strokeWidth="1.2" opacity="0.8" />
                <path d="M 80,38 C 86,48 87,68 84,80 C 83,84 81,88 77,90" fill="none" stroke="#d946ef" strokeWidth="1.2" opacity="0.8" />

                {/* Girl's Cybernetic Visor / Neural Eyes */}
                <path d="M 46,50 Q 60,47 74,50 Q 60,53 46,50 Z" 
                      fill={isTalking ? "#d946ef" : "#06b6d4"} 
                      stroke="#ffffff" 
                      strokeWidth="1" 
                      opacity={isTalking ? "1" : "0.85"}
                      className="transition-colors duration-300" />
                
                {/* Nose & Feminine Face Line */}
                <path d="M 60,54 L 60,60 L 58,62" fill="none" stroke="#06b6d4" strokeWidth="0.8" opacity="0.7" />

                {/* Lips / Speech Modulation Indicator */}
                {isTalking ? (
                  <ellipse cx="60" cy="67" rx="3.5" ry="2" fill="#d946ef" stroke="#ffffff" strokeWidth="0.6" className="animate-pulse" />
                ) : (
                  <path d="M 57,67 Q 60,68 63,67" fill="none" stroke="#06b6d4" strokeWidth="1" />
                )}

                {/* Cyber Earsets / Headset */}
                <circle cx="37" cy="54" r="3" fill="#06b6d4" stroke="#ffffff" strokeWidth="0.5" />
                <circle cx="83" cy="54" r="3" fill="#d946ef" stroke="#ffffff" strokeWidth="0.5" />
                <line x1="37" y1="54" x2="43" y2="52" stroke="#06b6d4" strokeWidth="1" />
                <line x1="83" y1="54" x2="77" y2="52" stroke="#d946ef" strokeWidth="1" />

                {/* High-tech Neural Core on Neck */}
                <circle cx="60" cy="80" r="2.5" fill="#06b6d4" className="animate-ping" />
                <line x1="48" y1="82" x2="72" y2="82" stroke="url(#memoraGlow)" strokeWidth="0.8" />
              </svg>
            </div>

            {/* Dynamic Voice Equalizer Waveform */}
            <div className="absolute bottom-4 flex gap-1 justify-center items-end h-7 w-full px-12 z-20">
              {[...Array(10)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    height: isTalking ? [4, Math.random() * 24 + 4, 4] : [2, Math.random() * 5 + 2, 2],
                    backgroundColor: isTalking ? (i % 2 === 0 ? "#06b6d4" : "#d946ef") : "#06b6d480"
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.35 + i * 0.08,
                    ease: "easeInOut"
                  }}
                  className="w-1 rounded-t"
                />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Live Status readout */}
        <div className="flex flex-col gap-1 mt-4">
          <div className="text-xs text-cyber-cyan font-bold uppercase tracking-widest flex items-center justify-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isTalking ? "bg-green-400 animate-ping" : isListening ? "bg-purple-400 animate-pulse" : "bg-cyber-cyan"}`}></span>
            <span>{systemStatus}</span>
          </div>
          {recognitionError && (
            <div className="text-[10px] text-red-400 font-semibold mt-2 border border-red-500/20 bg-red-950/20 px-3 py-1.5 rounded-lg flex items-center gap-2 justify-center">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{recognitionError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Conversational Chat Interface */}
      <div className="flex-[6] flex flex-col gap-4 bg-cyber-bg/40 border border-cyber-cyan/15 rounded-2xl p-4 sm:p-5 h-[550px] sm:h-auto overflow-hidden relative shadow-[0_0_20px_rgba(6,182,212,0.05)]">
        
        {/* Chat Feed Header */}
        <div className="flex items-center justify-between border-b border-cyber-cyan/10 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyber-cyan animate-pulse" />
            <span className="text-xs font-bold text-cyber-cyan uppercase tracking-wider">Memora Holographic Channel</span>
          </div>
          <button
            type="button"
            onClick={() => speakText(guideData[language].welcome, language)}
            className="flex items-center gap-1.5 text-[10px] bg-cyber-cyan/15 hover:bg-cyber-cyan/25 border border-cyber-cyan/35 text-cyber-cyan px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Greeting & Introduction</span>
          </button>
        </div>

        {/* Chat log body */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 font-mono text-xs">
          <AnimatePresence initial={false}>
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 gap-3 font-mono py-12">
                <div className="p-3 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/20">
                  <Sparkles className="w-7 h-7 text-cyber-cyan animate-pulse" />
                </div>
                <div className="flex flex-col gap-1 max-w-sm">
                  <span className="text-xs font-bold text-gray-200 uppercase">Memora is ready to talk</span>
                  <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                    Ask questions about your memories, school days, or tap a quick topic below. Memora speaks and understands English, Gujarati, and Hindi!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => speakText(guideData[language].welcome, language)}
                  className="mt-2 px-5 py-2.5 bg-gradient-to-r from-cyber-cyan/20 to-cyber-purple/20 hover:from-cyber-cyan/30 hover:to-cyber-purple/30 border border-cyber-cyan text-white text-xs font-bold rounded-xl tracking-wider transition-all cursor-pointer flex items-center gap-2 uppercase font-mono shadow-[0_0_15px_rgba(6,182,212,0.25)] animate-pulse"
                >
                  <Volume2 className="w-4 h-4 text-cyber-cyan" />
                  <span>Start Voice Introduction</span>
                </button>
              </div>
            ) : (
              messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col gap-1.5 max-w-[85%] ${
                    msg.sender === "user" ? "self-end items-end" : "self-start items-start"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                    {msg.sender === "user" ? (
                      <>
                        <span>{userName}</span>
                        <User className="w-3 h-3 text-cyber-cyan" />
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-cyber-purple" />
                        <span className="text-cyber-cyan">MEMORA // AI COMPANION</span>
                      </>
                    )}
                  </div>
                  <div
                    className={`rounded-xl px-4 py-2.5 border leading-relaxed break-words font-sans text-xs ${
                      msg.sender === "user"
                        ? "bg-cyber-cyan/10 border-cyber-cyan/25 text-gray-200"
                        : "bg-cyber-purple/10 border-cyber-purple/25 text-cyan-100 shadow-[0_0_10px_rgba(6,182,212,0.05)]"
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </div>

        {/* Quick Topic Chips (Conversational & Feature triggers) */}
        <div className="flex flex-col gap-1.5 border-t border-cyber-cyan/10 pt-3 select-none">
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Quick Prompts for Memora:</span>
          
          <div className="flex flex-wrap gap-1.5">
            {/* Gujarati Prompts */}
            <button
              onClick={() => handleChipClick("તમારું નામ શું છે અને તમારું કામ શું છે?")}
              className="py-1 px-2.5 bg-cyber-cyan/10 border border-cyber-cyan/25 hover:border-cyber-cyan text-[10px] text-cyber-cyan rounded-md transition-all cursor-pointer font-sans"
            >
              તમારું નામ શું છે?
            </button>
            <button
              onClick={() => handleChipClick("મારી સ્કૂલની યાદો કઈ રીતે સ્ટોર કરું?")}
              className="py-1 px-2.5 bg-cyber-purple/10 border border-cyber-purple/25 hover:border-cyber-purple text-[10px] text-cyber-purple rounded-md transition-all cursor-pointer font-sans"
            >
              મારી સ્કૂલની યાદો વિશે
            </button>

            {/* English Prompts */}
            <button
              onClick={() => handleChipClick("Tell me about yourself and your name")}
              className="py-1 px-2.5 bg-white/5 border border-white/10 hover:border-cyber-cyan/40 text-[10px] text-gray-300 hover:text-white rounded-md transition-all cursor-pointer font-sans"
            >
              Who is Memora?
            </button>
            <button
              onClick={() => handleChipClick("How do I store my school memories and files?")}
              className="py-1 px-2.5 bg-white/5 border border-white/10 hover:border-cyber-cyan/40 text-[10px] text-gray-300 hover:text-white rounded-md transition-all cursor-pointer font-sans"
            >
              School Memories Guide
            </button>
            <button
              onClick={() => handleChipClick("How do constellation map and temporal vault work?")}
              className="py-1 px-2.5 bg-white/5 border border-white/10 hover:border-cyber-cyan/40 text-[10px] text-gray-300 hover:text-white rounded-md transition-all cursor-pointer font-sans"
            >
              Constellation & Vault
            </button>
          </div>
        </div>

        {/* Input Bar Form */}
        <form onSubmit={handleFormSubmit} className="flex gap-2 border-t border-cyber-cyan/10 pt-3 items-center">
          {/* Micro button trigger */}
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex-shrink-0 ${
              isListening
                ? "bg-cyber-purple/20 border-cyber-purple text-cyber-purple shadow-[0_0_15px_rgba(217,70,239,0.5)] animate-pulse"
                : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
            }`}
            title={isListening ? "Stop listening" : "Speak to Memora (Auto language detection: EN/GU/HI)"}
          >
            {isListening ? <Mic className="w-4 h-4 text-cyber-purple" /> : <MicOff className="w-4 h-4" />}
          </button>

          {/* Typing input */}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask Memora in Gujarati, English, or Hindi..."
            className="flex-1 bg-[#01040a]/80 border border-cyber-cyan/15 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-cyber-cyan font-sans"
          />

          {/* Send button */}
          <button
            type="submit"
            className="p-3 bg-cyber-cyan/15 hover:bg-cyber-cyan/25 border border-cyber-cyan text-cyber-cyan hover:text-white rounded-xl transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.2)]"
            title="Send query"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );

  function playScanBeep() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      gain.gain.setValueAtTime(0.015, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  }
}
