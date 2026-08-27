"use client";

import React, { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, Mic, MicOff, AlertCircle, Send, Sparkles, User, Bot } from "lucide-react";
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
  const [systemStatus, setSystemStatus] = useState("Hologram status: Idle. Speak or type to begin.");
  const [recognitionError, setRecognitionError] = useState("");

  const speechSynthRef = useRef<SpeechSynthesis | null>(null);
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const userName = currentUser?.displayName || currentUser?.username || "Guest";

  // Guide Database in English, Hindi, and Gujarati
  const guideData = {
    en: {
      welcome: `Hi ${userName}! I am your Hologram Guide. Welcome to Memento. How can I help you today?`,
      whatIsMemento: "Memento is a futuristic digital memory archiver and temporal vault. It allows you to sync your memories to a secure database and schedule legacy letters to the future.",
      memoirDeck: "The Memoir Deck is where you write and save new memory nodes. You can select emotional resonance levels and tag memories for organization.",
      constellationMap: "The Constellation Map visualizes your saved memories as nodes in a star system, connecting related ideas like neural pathways.",
      temporalVault: "The Temporal Vault lets you write time-capsule letters and schedule them to be decrypted and delivered at a specific future date.",
      stop: "Speech stopped. Let me know if you need any other help!",
      unknown: "I am here to guide you. You can ask me about Memento, Memoir Deck, Constellation Map, or Temporal Vault."
    },
    gu: {
      welcome: `નમસ્તે ${userName}! હું તમારો હોલોગ્રામ ગાઈડ છું. મોમેન્ટોમાં તમારું સ્વાગત છે. હું તમારી શું મદદ કરું?`,
      whatIsMemento: "મોમેન્ટો એક ફ્યુચરિસ્ટિક ડિજિટલ મેમરી આર્કાઇવર અને ટેમ્પોરલ વૉલ્ટ છે. તે તમારી સ્મૃતિઓને સુરક્ષિત ડેટાબેઝમાં સાચવે છે અને ભવિષ્ય માટે પત્રો શેડ્યૂલ કરવા દે છે.",
      memoirDeck: "મેમોઇર ડેક એ જગ્યા છે જ્યાં તમે નવી સ્મૃતિઓ લખી શકો છો. તમે લાગણીઓનું સ્તર અને ટેગ પસંદ કરી સ્મૃતિઓને સંગ્રહિત કરી શકો છો.",
      constellationMap: "નક્ષત્ર નકશો તમારી સાચવેલી સ્મૃતિઓને તારામંડળમાં નોડ્સ તરીકે દર્શાવે છે, જે મગજના જ્ઞાનતંતુઓની જેમ એકબીજા સાથે જોડાયેલ છે.",
      temporalVault: "ટેમ્પોરલ વૉલ્ટ તમને ટાઇમ-કેપ્સ્યુલ પત્રો લખવા અને તેને ભવિષ્યની ચોક્કસ તારીખે મોકલવા માટે શેડ્યૂલ કરવાની મંજૂરી આપી છે.",
      stop: "વાતચીત બંધ થઈ છે. જો બીજી કોઈ જરૂર હોય તો જણાવો!",
      unknown: "હું તમને મદદ કરવા માટે અહીં છું. તમે મને મોમેન્ટો, મેમોઇર ડેક, નક્ષત્ર નકશો અથવા ટેમ્પોરલ વૉલ્ટ વિશે પૂછી શકો છો."
    },
    hi: {
      welcome: `नमस्ते ${userName}! मैं आपका होलोग्राम गाइड हूँ। मोमेंटो में आपका स्वागत है। मैं आपकी क्या मदद कर सकता हूँ?`,
      whatIsMemento: "मोमेंटो एक भविष्यवादी डिजिटल मेमोरी आर्काइवर और टेम्पोरल वॉल्ट है। यह आपको अपनी यादों को सुरक्षित डेटाबेस में सहेजने और भविष्य के लिए पत्र शेड्यूल करने की अनुमति देता है।",
      memoirDeck: "मेमोइर डेक वह जगह है जहां आप नई यादें लिखते और सहेजते हैं। आप भावनाओं का स्तर चुन सकते हैं और उन्हें व्यवस्थित करने के लिए टैग लगा सकते हैं।",
      constellationMap: "नक्षत्र मानचित्र आपकी सहेजी गई यादों को एक तारा प्रणाली में नोड्स के रूप में दिखाता है, जो मस्तिष्क के न्यूरॉन्स की तरह जुड़े होते हैं।",
      temporalVault: "टेम्पोरल वॉल्ट आपको टाइम-कैप्सूल पत्र लिखने और भविष्य की एक निश्चित तारीख पर खोलने के लिए शेड्यूल करने की सुविधा देता है।",
      stop: "बातचीत बंद। अगर आपको कोई अन्य मदद चाहिए तो मुझे बताएं!",
      unknown: "मैं आपकी सहायता के लिए यहाँ हूँ। आप मोमेंटो, मेमोइर डेक, नक्षत्र मानचित्र या टेम्पोरल वॉल्ट के बारे में पूछ सकते हैं।"
    }
  };

  // Automatic Language Detector logic supporting Unicode & Roman transliteration
  const detectLanguage = (input: string): Language => {
    const text = input.toLowerCase().trim();
    
    // 1. Unicode Check (Gujarati range \u0A80-\u0AFF)
    if (/[\u0A80-\u0AFF]/.test(text)) return "gu";
    
    // 2. Unicode Check (Devanagari/Hindi range \u0900-\u097F)
    if (/[\u0900-\u097F]/.test(text)) return "hi";
    
    // 3. Roman Transliteration Keywords Check
    const guKeywords = ["kem", "cho", "shu", "che", "tame", "karo", "pan", "vaat", "naksho", "nathi", "saru", "bol"];
    const hiKeywords = ["kya", "kaise", "hai", "ap", "tum", "batao", "namaste", "baat", "hua", "achha", "suno", "samjhao"];
    
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

      // Initialize Speech Recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        
        // Listen to all languages by setting broad recognition config
        rec.onstart = () => {
          setIsListening(true);
          setSystemStatus("Listening to your voice...");
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
            setRecognitionError("Microphone permission denied.");
          } else {
            setRecognitionError(`Speech recognition failed: ${event.error}`);
          }
          setSystemStatus("Hologram status: Idle");
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

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Speech Recognition dynamically maps lang based on expected user input or defaults to multilingual auto
  const startListening = () => {
    if (!recognitionRef.current) {
      setRecognitionError("Speech recognition is not supported in this browser.");
      return;
    }
    
    if (speechSynthRef.current) {
      speechSynthRef.current.cancel();
    }
    setIsTalking(false);
    
    // Auto set recognition locale based on last message language, or default to general IN/US
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

  // Text-To-Speech with local device voice selection
  const speakText = (text: string, langCode: Language, skipChatLog = false) => {
    if (!speechSynthRef.current) return;
    
    speechSynthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = speechSynthRef.current.getVoices();
    let preferredVoice = null;
    
    if (langCode === "gu") {
      preferredVoice = voices.find(v => v.lang.startsWith("gu") || v.lang.includes("Gujarati"));
      if (!preferredVoice) {
        preferredVoice = voices.find(v => v.lang.startsWith("hi") || v.lang.includes("Hindi"));
      }
    } else if (langCode === "hi") {
      preferredVoice = voices.find(v => v.lang.startsWith("hi") || v.lang.includes("Hindi"));
    } else {
      preferredVoice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("David") || v.name.includes("Google") || v.name.includes("Natural")));
    }
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.pitch = 1.08;
    utterance.rate = 0.95;
    utterance.volume = 0.9;
    
    utterance.onstart = () => {
      setIsTalking(true);
      setSystemStatus("Hologram is speaking...");
      if (!skipChatLog) {
        setMessages(prev => [
          ...prev,
          { id: Math.random().toString(), sender: "guide", text, lang: langCode }
        ]);
      }
    };
    
    utterance.onend = () => {
      setIsTalking(false);
      setSystemStatus("Hologram status: Idle. Awaiting user input.");
    };
    
    speechSynthRef.current.speak(utterance);
  };

  // Core processing and routing matching user queries
  const handleProcessInput = (input: string) => {
    if (!input.trim()) return;

    // 1. Detect language
    const lang = detectLanguage(input);
    setLanguage(lang);

    // 2. Add user question to chat logs
    setMessages(prev => [
      ...prev,
      { id: Math.random().toString(), sender: "user", text: input, lang }
    ]);

    // 3. Find response inside database
    const textLower = input.toLowerCase();
    const data = guideData[lang];
    let responseText = data.unknown;

    if (lang === "en") {
      if (textLower.includes("what is") || textLower.includes("memento") || textLower.includes("app") || textLower.includes("website")) {
        responseText = data.whatIsMemento;
      } else if (textLower.includes("memoir") || textLower.includes("write") || textLower.includes("deck") || textLower.includes("save")) {
        responseText = data.memoirDeck;
      } else if (textLower.includes("constellation") || textLower.includes("star") || textLower.includes("map") || textLower.includes("nodes")) {
        responseText = data.constellationMap;
      } else if (textLower.includes("vault") || textLower.includes("letter") || textLower.includes("future") || textLower.includes("schedule")) {
        responseText = data.temporalVault;
      } else if (textLower.includes("stop") || textLower.includes("cancel") || textLower.includes("shut up")) {
        responseText = data.stop;
      }
    } else if (lang === "gu") {
      if (textLower.includes("શું છે") || textLower.includes("મોમેન્ટો") || textLower.includes("વેબસાઇટ") || textLower.includes("memento")) {
        responseText = data.whatIsMemento;
      } else if (textLower.includes("મેમોઇર") || textLower.includes("લખ") || textLower.includes("ડેક") || textLower.includes("સેવ")) {
        responseText = data.memoirDeck;
      } else if (textLower.includes("નકશો") || textLower.includes("તારા") || textLower.includes("નક્ષત્ર")) {
        responseText = data.constellationMap;
      } else if (textLower.includes("વૉલ્ટ") || textLower.includes("પત્ર") || textLower.includes("ભવિષ્ય") || textLower.includes("શેડ્યૂલ")) {
        responseText = data.temporalVault;
      } else if (textLower.includes("બંધ") || textLower.includes("સ્ટોપ") || textLower.includes("bas")) {
        responseText = data.stop;
      }
    } else if (lang === "hi") {
      if (textLower.includes("क्या है") || textLower.includes("मोमेंटो") || textLower.includes("वेबसाइट") || textLower.includes("memento")) {
        responseText = data.whatIsMemento;
      } else if (textLower.includes("मेमोइर") || textLower.includes("लिखे") || textLower.includes("डेक") || textLower.includes("सेव")) {
        responseText = data.memoirDeck;
      } else if (textLower.includes("नक्शा") || textLower.includes("तारा") || textLower.includes("नक्षत्र")) {
        responseText = data.constellationMap;
      } else if (textLower.includes("वॉल्ट") || textLower.includes("पत्र") || textLower.includes("भविष्य") || textLower.includes("शेड्यूल")) {
        responseText = data.temporalVault;
      } else if (textLower.includes("बंद") || textLower.includes("रोक") || textLower.includes("bas")) {
        responseText = data.stop;
      }
    }

    // 4. Speak response
    setTimeout(() => {
      speakText(responseText, lang);
    }, 400);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    handleProcessInput(inputValue);
    setInputValue("");
  };

  const handleChipClick = (queryKey: "whatIsMemento" | "memoirDeck" | "constellationMap" | "temporalVault", expectedLang: Language) => {
    playScanBeep();
    const promptText = 
      queryKey === "whatIsMemento" 
        ? (expectedLang === "gu" ? "મોમેન્ટો શું છે?" : expectedLang === "hi" ? "मोमेंटो क्या है?" : "What is Memento?")
        : queryKey === "memoirDeck"
        ? (expectedLang === "gu" ? "મેમોઇર ડેક વિશે જણાવો" : expectedLang === "hi" ? "मेमोइर डेक क्या है?" : "Explain Memoir Deck")
        : queryKey === "constellationMap"
        ? (expectedLang === "gu" ? "નક્ષત્ર નકશો સમજાવો" : expectedLang === "hi" ? "नक्षत्र मानचित्र समझाएं" : "Show Constellation Map")
        : (expectedLang === "gu" ? "ટેમ્પોરલ વૉલ્ટ શું છે?" : expectedLang === "hi" ? "टैम्पोरल वॉल्ट क्या है?" : "What is Temporal Vault?");
        
    handleProcessInput(promptText);
  };

  return (
    <div className="flex-1 flex flex-col xl:flex-row gap-6 w-full max-w-7xl mx-auto h-full p-1 font-mono">
      
      {/* Left Column: Huge pulsing visualizer */}
      <div className="flex-[4] flex flex-col gap-4 bg-cyber-bg/40 border border-cyber-cyan/15 rounded-2xl p-6 relative overflow-hidden flex justify-center items-center text-center shadow-[0_0_20px_rgba(6,182,212,0.05)]">
        
        {/* Futuristic Grid background */}
        <div className="absolute inset-0 bg-cyber-grid bg-[size:30px_30px] opacity-10 pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyber-cyan/35 to-transparent"></div>

        <span className="absolute top-4 left-4 text-[9px] text-cyber-cyan font-bold tracking-widest uppercase">
          [ INTEGRATED HOLOGRAM CORE ]
        </span>
        <span className="absolute top-4 right-4 text-[9px] text-gray-500 font-bold uppercase tracking-widest">
          AUTO LANG DETECT: ACTIVE
        </span>

        {/* Outer rotating/glowing elements */}
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
          {/* Hologram rings */}
          <div className={`absolute inset-0 rounded-full border border-dashed border-cyber-cyan/30 animate-spin ${isTalking ? "duration-[10s]" : "duration-[40s]"}`}></div>
          <div className={`absolute inset-4 rounded-full border border-cyber-purple/20 animate-spin ${isTalking ? "duration-[8s] direction-reverse" : "duration-[30s] direction-reverse"}`}></div>
          
          {/* Main pulsing core */}
          <motion.div 
            animate={{
              scale: isTalking ? [1, 1.12, 1] : [1, 1.03, 1],
              opacity: isTalking ? [0.8, 1, 0.8] : [0.5, 0.7, 0.5]
            }}
            transition={{
              repeat: Infinity,
              duration: isTalking ? 1.5 : 4,
              ease: "easeInOut"
            }}
            className="w-48 h-48 sm:w-56 sm:h-56 rounded-full border-2 border-cyber-cyan bg-cyber-cyan/5 flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.25)] relative"
          >
            {/* Pulsing wave canvas avatar */}
            <div className="absolute inset-10 rounded-full bg-gradient-to-tr from-cyber-cyan/20 to-cyber-purple/20 animate-pulse"></div>
            <Bot className={`w-14 h-14 ${isTalking ? "text-cyber-cyan drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]" : "text-cyber-cyan/40"}`} />
            
            {/* Visualizer bars overlay */}
            <div className="absolute bottom-6 flex gap-1 justify-center items-end h-6 w-full px-8">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    height: isTalking ? [4, Math.random() * 20 + 4, 4] : [2, Math.random() * 6 + 2, 2]
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.5 + i * 0.1,
                    ease: "easeInOut"
                  }}
                  className="w-1 bg-cyber-cyan rounded-t"
                />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Telemetry status readout */}
        <div className="flex flex-col gap-1 mt-6">
          <div className="text-xs text-cyber-cyan font-bold uppercase tracking-widest flex items-center justify-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isTalking ? "bg-green-500 animate-ping" : "bg-cyber-cyan"}`}></span>
            {systemStatus}
          </div>
          {recognitionError && (
            <div className="text-[10px] text-red-400 font-semibold mt-2 border border-red-500/20 bg-red-950/10 px-3 py-1.5 rounded-lg flex items-center gap-2 justify-center">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{recognitionError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Immersive Interaction Panel */}
      <div className="flex-[6] flex flex-col gap-4 bg-cyber-bg/40 border border-cyber-cyan/15 rounded-2xl p-4 sm:p-5 h-[550px] sm:h-auto overflow-hidden relative shadow-[0_0_20px_rgba(6,182,212,0.05)]">
        
        {/* Chat log body */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 font-mono text-xs">
          <AnimatePresence initial={false}>
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 gap-2 font-mono py-12">
                <Sparkles className="w-8 h-8 text-cyber-cyan/30 animate-pulse" />
                <p className="max-w-xs text-[10px] leading-relaxed mt-1">
                  Type a query below or speak into the microphone. The Hologram detects English, Hindi, and Gujarati automatically.
                </p>
                <button
                  type="button"
                  onClick={() => speakText(guideData[language].welcome, language)}
                  className="mt-4 px-5 py-2.5 bg-cyber-cyan/15 hover:bg-cyber-cyan/25 border border-cyber-cyan text-cyber-cyan hover:text-white text-xs font-bold rounded-xl tracking-wider transition-all cursor-pointer flex items-center gap-2 uppercase font-mono shadow-[0_0_15px_rgba(6,182,212,0.25)] animate-pulse"
                >
                  <Volume2 className="w-4 h-4" />
                  Start Voice Guide
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
                  <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                    {msg.sender === "user" ? (
                      <>
                        <span>{userName}</span>
                        <User className="w-3 h-3 text-cyber-cyan" />
                      </>
                    ) : (
                      <>
                        <Bot className="w-3 h-3 text-cyber-purple" />
                        <span>MEMENTO GUIDE</span>
                      </>
                    )}
                  </div>
                  <div
                    className={`rounded-xl px-3.5 py-2.5 border leading-relaxed break-words ${
                      msg.sender === "user"
                        ? "bg-cyber-cyan/10 border-cyber-cyan/25 text-gray-200"
                        : "bg-cyber-purple/10 border-cyber-purple/20 text-cyber-cyan"
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

        {/* Quick Guide Chips in 3 Languages */}
        <div className="flex flex-col gap-2 border-t border-cyber-cyan/10 pt-4 select-none">
          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Quick click guides (Auto switches speech language):</span>
          
          {/* Gujarati Chips */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[8px] text-cyber-cyan font-bold uppercase flex items-center pr-1">GJ:</span>
            <button
              onClick={() => handleChipClick("whatIsMemento", "gu")}
              className="py-1 px-2.5 bg-white/5 border border-white/10 hover:border-cyber-cyan/35 text-[9px] text-gray-300 hover:text-white rounded-md transition-all cursor-pointer"
            >
              મોમેન્ટો શું છે?
            </button>
            <button
              onClick={() => handleChipClick("memoirDeck", "gu")}
              className="py-1 px-2.5 bg-white/5 border border-white/10 hover:border-cyber-cyan/35 text-[9px] text-gray-300 hover:text-white rounded-md transition-all cursor-pointer"
            >
              મેમોઇર ડેક વિશે
            </button>
          </div>

          {/* Hindi Chips */}
          <div className="flex flex-wrap gap-1.5 mt-1">
            <span className="text-[8px] text-cyber-purple font-bold uppercase flex items-center pr-1">HI:</span>
            <button
              onClick={() => handleChipClick("whatIsMemento", "hi")}
              className="py-1 px-2.5 bg-white/5 border border-white/10 hover:border-cyber-purple/40 text-[9px] text-gray-300 hover:text-white rounded-md transition-all cursor-pointer"
            >
              मोमेंटो क्या है?
            </button>
            <button
              onClick={() => handleChipClick("constellationMap", "hi")}
              className="py-1 px-2.5 bg-white/5 border border-white/10 hover:border-cyber-purple/40 text-[9px] text-gray-300 hover:text-white rounded-md transition-all cursor-pointer"
            >
              नक्षत्र मानचित्र समझाएं
            </button>
          </div>

          {/* English Chips */}
          <div className="flex flex-wrap gap-1.5 mt-1">
            <span className="text-[8px] text-gray-500 font-bold uppercase flex items-center pr-1">EN:</span>
            <button
              onClick={() => handleChipClick("whatIsMemento", "en")}
              className="py-1 px-2.5 bg-white/5 border border-white/10 hover:border-white/20 text-[9px] text-gray-300 hover:text-white rounded-md transition-all cursor-pointer"
            >
              What is Memento?
            </button>
            <button
              onClick={() => handleChipClick("temporalVault", "en")}
              className="py-1 px-2.5 bg-white/5 border border-white/10 hover:border-white/20 text-[9px] text-gray-300 hover:text-white rounded-md transition-all cursor-pointer"
            >
              Temporal Vault Guide
            </button>
          </div>
        </div>

        {/* Input Bar Form */}
        <form onSubmit={handleFormSubmit} className="flex gap-2 border-t border-cyber-cyan/10 pt-4 items-center">
          {/* Micro button trigger */}
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex-shrink-0 ${
              isListening
                ? "bg-cyber-purple/15 border-cyber-purple text-cyber-purple shadow-[0_0_12px_rgba(217,70,239,0.4)] animate-pulse"
                : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
            }`}
            title={isListening ? "Stop listening" : "Speak query (Auto language detection)"}
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          {/* Typing input */}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type query in Hindi, English, or Gujarati..."
            className="flex-1 bg-[#01040a]/80 border border-cyber-cyan/15 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-cyber-cyan font-mono"
          />

          {/* Send button */}
          <button
            type="submit"
            className="p-3 bg-cyber-cyan/15 hover:bg-cyber-cyan/25 border border-cyber-cyan text-cyber-cyan hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );

  // Audio SFX fallbacks
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
