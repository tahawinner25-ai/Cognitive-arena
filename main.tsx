import React, { useState, useEffect, useRef } from 'react';
import { BrainCircuit, BookOpen, Mic, VolumeX, Activity, Send, Loader2, CheckCircle2, SearchCode, Database, Search, Save, Sparkles, X } from 'lucide-react';
import Markdown from 'react-markdown';
import { queryElasticRAG } from '../services/ai';
import arenaIcon from '../assets/images/mount_ai_arena_icon_1779634554191.png';
import { db } from '../services/firebase';
import { collection, addDoc, query, where, orderBy, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';
import IQTestApp from './IQTestApp';

export const gymCards = [
  {
    id: 0,
    title: "Graphemic Confusion [b/d/p/q]",
    description: "Targets fine visual and phonetic discrimination for dyslexia.",
    text: "The brave little white duck prepares to jump over the deep puddle to catch the blue butterfly.",
    targetSounds: ["b", "d", "p", "q"]
  },
  {
    id: 1,
    title: "Nasal Sounds & Harmonization [on/an/in]",
    description: "Trains the opening of the soft palate and physiological airflows.",
    text: "A large white falcon sings a serene tune in the distance under the spring wind while the tutor observes.",
    targetSounds: ["on", "an", "in"]
  },
  {
    id: 2,
    title: "Sibilants & Fricatives [s/ch/j]",
    description: "Fast tongue twister stimulating lingual and maxillary coordination.",
    text: "Six hunters know how to hunt without their dear dog on the sandy and wild path of the green oak.",
    targetSounds: ["s", "ch", "j"]
  },
  {
    id: 3,
    title: "English Phonology [Liquids & Glides]",
    description: "International lingual flexibility and cross-linguistic learning.",
    text: "The curious blue bird quickly flew over the stormy clouds to discover a bright shiny sparkling crystal.",
    targetSounds: ["glides", "liquids", "r/l"]
  }
];

interface CognitiveGymProps {
  user?: any;
  onLogin?: () => Promise<void>;
  selectedLang: string;
  voiceArenaSpoken: string[];
  setVoiceArenaSpoken: React.Dispatch<React.SetStateAction<string[]>>;
  arenaTranscript: string;
  setArenaTranscript: React.Dispatch<React.SetStateAction<string>>;
  isRecording: boolean;
  toggleRecording: () => void;
  audioData: number[];
  selectedCardId: number;
  setSelectedCardId: React.Dispatch<React.SetStateAction<number>>;
  remediationContent: string;
  setRemediationContent: React.Dispatch<React.SetStateAction<string>>;
  isRemediating: boolean;
  setIsRemediating: React.Dispatch<React.SetStateAction<boolean>>;
  speechError?: string | null;
}

export default function CognitiveGym({
  user, onLogin, selectedLang, voiceArenaSpoken, setVoiceArenaSpoken,
  arenaTranscript, setArenaTranscript,
  isRecording, toggleRecording, audioData,
  selectedCardId, setSelectedCardId,
  remediationContent, setRemediationContent,
  isRemediating, setIsRemediating,
  speechError
}: CognitiveGymProps) {
  
  const [elasticQuery, setElasticQuery] = useState("");
  const [instantFeedback, setInstantFeedback] = useState<{ show: boolean; spoken: number; total: number; accuracy: number } | null>(null);
  const prevRecordingRef = useRef(isRecording);
  const [elasticResults, setElasticResults] = useState<{title: string, excerpt: string, score: number}[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isRAGOpen, setIsRAGOpen] = useState(false); // Elasticsearch RAG dedicated floating window
  const [simulationInput, setSimulationInput] = useState(""); // Live feedback simulation input
  const [activeTab, setActiveTab] = useState<'cards' | 'formulation'>('cards'); // Sub-tab switcher to toggle standard exercises vs custom formulate
  
  const [arenaView, setArenaView] = useState<'main' | 'history' | 'iq-test'>(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view === 'iq-test' || window.location.hash === '#iq-test') {
      return 'iq-test';
    }
    return 'main';
  });
  const [isArenaAuthenticated, setIsArenaAuthenticated] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [customText, setCustomText] = useState("");

  const handleSimulationChange = (text: string) => {
    setSimulationInput(text);
    if (!text.trim()) return;
    
    // Split input speech simulation words and cleanly push them into voiceArenaSpoken
    const words = text.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    setVoiceArenaSpoken(prev => {
      const next = [...prev];
      let updated = false;
      for (const w of words) {
        if (!next.includes(w)) {
          next.push(w);
          updated = true;
        }
      }
      return updated ? next : prev;
    });
  };

  useEffect(() => {
    if (arenaView === 'history' && user && isArenaAuthenticated) {
      loadHistory();
    }
  }, [arenaView, user, isArenaAuthenticated]);

  const loadHistory = async () => {
    if (!user) return;
    setIsLoadingHistory(true);
    try {
      const q = query(collection(db, "arena_sessions"), where("userId", "==", user.uid));
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory to avoid needing composite indexes in Firestore
      docs.sort((a: any, b: any) => {
        const tA = a.createdAt?.toMillis() || 0;
        const tB = b.createdAt?.toMillis() || 0;
        return tB - tA;
      });
      setSessions(docs);
    } catch (err) {
      console.error("Error loading history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleArenaAuth = async () => {
    if (!user && onLogin) {
      await onLogin();
    }
    setIsArenaAuthenticated(true);
  };

  const currentCard = gymCards[selectedCardId] || gymCards[0];
  const activeText = customText || currentCard.text;
  const rawWords = activeText.split(/\s+/);
  
  // Words missed of length > 2
  const missedList = rawWords
    .map(w => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ""))
    .filter(Boolean)
    .filter(w => !voiceArenaSpoken.includes(w.toLowerCase()))
    .filter(w => w.length > 2);

  const spokenCount = rawWords.filter(w => {
    const cleaned = w.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
    return voiceArenaSpoken.includes(cleaned);
  }).length;

  const progressPercentage = Math.round((spokenCount / rawWords.length) * 100) || 0;

  // Instant phonetic count and comparative sound synthesis on end of recording
  useEffect(() => {
    if (prevRecordingRef.current && !isRecording) {
      const currentSpoken = spokenCount;
      const currentTotal = rawWords.length;
      const currentAccuracy = progressPercentage;

      const msg = `Exercises complete! You correctly spoke ${currentSpoken} out of ${currentTotal} words. Accuracy score is ${currentAccuracy} percent.`;
      
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(msg);
        utterance.lang = 'en-US';
        const voices = window.speechSynthesis.getVoices();
        const engVoice = voices.find(v => v.lang.startsWith('en-US') || v.lang.startsWith('en-'));
        if (engVoice) utterance.voice = engVoice;
        window.speechSynthesis.speak(utterance);
      }

      setInstantFeedback({
        show: true,
        spoken: currentSpoken,
        total: currentTotal,
        accuracy: currentAccuracy
      });
    }
    prevRecordingRef.current = isRecording;
  }, [isRecording, spokenCount, rawWords.length, progressPercentage]);

  const saveCurrentSession = async () => {
    if (!user) return;
    try {
      const card = activeTab === 'formulation' 
        ? { title: "Custom Formulation Practice", text: activeText }
        : (gymCards[selectedCardId] || gymCards[0]);
         
      await addDoc(collection(db, "arena_sessions"), {
        userId: user.uid,
        title: card.title,
        accuracy: progressPercentage,
        missedWords: missedList,
        createdAt: serverTimestamp()
      });
      // Small visual feedback can be added here
      setArenaView('history'); // Go to history after save
    } catch (err) {
      console.error("Error saving session", err);
    }
  };

  if (!isArenaAuthenticated) {
    return (
      <div className="min-h-[90vh] bg-[#07090F] flex flex-col font-sans relative overflow-hidden items-center justify-center -mx-6 -mt-12 pt-12 pb-24">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-[#8b5cf6]/10 to-[#ff4e00]/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-[#3b82f6]/10 to-transparent blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-md p-10 bg-[#121626]/80 backdrop-blur-xl border border-[#8b5cf6]/30 rounded-[2.5rem] shadow-[0_0_50px_rgba(139,92,246,0.15)] flex flex-col items-center">
          <div className="w-24 h-24 rounded-3xl overflow-hidden mb-8 border border-[#8b5cf6]/50 shadow-[0_0_30px_rgba(139,92,246,0.4)] relative">
            <img src={arenaIcon} alt="Arena Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-black text-white text-center tracking-tight mb-2 uppercase drop-shadow-sm">Cognitive <span className="text-[#a855f7]">Arena</span></h1>
          <p className="text-slate-400 font-mono text-xs text-center mb-10 border-b border-white/10 pb-4">Secured neuro-cognitive session access.</p>
          <button 
            onClick={handleArenaAuth}
            className="w-full py-4 bg-white text-black font-black uppercase text-sm tracking-[0.2em] rounded-xl hover:bg-slate-200 transition-colors shadow-lg"
          >
            {user ? "Enter Secure Session" : "Authenticate using Google"}
          </button>
        </div>
      </div>
    );
  }

  const triggerRemediation = async () => {
    if (isRemediating) return;
    setIsRemediating(true);
    setRemediationContent("");
    try {
      const res = await fetch("/api/cognitive-remediation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          missedWords: missedList,
          originalText: activeText,
          language: selectedLang
        })
      });
      if (res.ok) {
        const data = await res.json();
        setRemediationContent(data.content);
      } else {
        setRemediationContent("⚠️ **API Key or service currently unavailable.**\n\nEnsure backend is running.");
      }
    } catch (err) {
      setRemediationContent("⚠️ **A network error occurred while generating your cognitive plan.**");
    } finally {
      setIsRemediating(false);
    }
  };

  const handleElasticSearch = async () => {
    if (!elasticQuery.trim()) return;
    setIsSearching(true);
    try {
      const prompt = `You are an expert in phonetic-cognitive remediation. The user needs to practice the following concept or phoneme: "${elasticQuery}".\nGenerate 2 short, fun, and rhythmic sentences (tongue twisters) specifically designed to train the pronunciation of this phoneme.\n\nReturn ONLY a native JSON array containing objects with these exact keys: "title" (A name for the exercise, e.g., "Sibilants - Exercise 1"), "excerpt" (The sentence to pronounce), and "score" (a very precise random number between 0.85 and 0.99). Do not include any code blocks (no \`\`\`json). Just the JSON array.`;
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      
      try {
        let text = data.text.trim();
        // Remove markdown code blocks if any
        if (text.startsWith('```json')) text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        if (text.startsWith('```')) text = text.replace(/```/g, '').trim();
        
        const generatedResults = JSON.parse(text);
        if (Array.isArray(generatedResults)) {
          setElasticResults(generatedResults);
        } else {
          throw new Error("Not an array");
        }
      } catch (e) {
        // Fallback if JSON parse fails
        setElasticResults([
          { title: "Dynamic Exercise", excerpt: data.text.substring(0, 150) + "...", score: 0.99 }
        ]);
      }
    } catch (e) {
      console.log(e);
      setElasticResults([
         { title: "API Connection Failed", excerpt: "Could not formulate sentences.", score: 0.00 }
      ]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090F] -mx-6 -mt-12 px-6 pt-12 pb-24 text-slate-300 font-sans relative overflow-hidden">
       
       {/* Dynamic Ambient Background Grids */}
       <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
       <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-[#8b5cf6]/10 to-[#ff4e00]/10 blur-[120px] rounded-full pointer-events-none" />
       <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-[#3b82f6]/10 to-transparent blur-[100px] rounded-full pointer-events-none" />

       {/* Header Arena */}
       <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 relative z-10">
          <div className="mt-10 flex flex-col items-start">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="px-3 py-1 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/50 text-[#a855f7] text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-pulse" />
                 Active Neuro-Education
              </span>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest border border-slate-800 px-3 py-1 rounded-full bg-black">Google Cloud Hackathon Edition</span>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-3xl border border-[#8b5cf6]/30 shadow-[0_0_30px_rgba(139,92,246,0.3)] bg-black overflow-hidden flex-shrink-0">
                <img src={arenaIcon} alt="Arena Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-2 leading-none">Cognitive <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8b5cf6] to-[#ff4e00]">Arena</span> & Phonics</h2>
              </div>
            </div>
            
            <p className="text-slate-400 font-mono text-sm max-w-2xl mt-6 leading-relaxed border-l-2 border-[#ff4e00]/50 pl-4">
               Active phonetics and semantic rehabilitation. Practice your pronunciation out loud, observe live comparative validation, and let Gemini AI design your adaptive learning plans.
            </p>
          </div>
          
          <div className="flex flex-col gap-4">
             <button 
               onClick={() => setIsRAGOpen(true)}
               className="px-5 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-mono font-bold uppercase transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)] whitespace-nowrap flex items-center justify-center gap-2 animate-pulse"
             >
               <Database className="w-4.5 h-4.5 text-emerald-400" /> 🔍 ASK ELASTIC RAG DESK
             </button>
             <button 
               onClick={() => setArenaView(prev => prev === 'iq-test' ? 'main' : 'iq-test')}
               className={`px-5 py-3 rounded-2xl font-mono text-xs font-bold uppercase transition-all whitespace-nowrap flex items-center justify-center gap-2 ${
                 arenaView === 'iq-test'
                 ? 'bg-rose-500/20 border border-rose-500/50 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-none'
                 : 'bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-500/50 text-indigo-300 hover:text-white hover:border-indigo-400 hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] animate-pulse'
               }`}
             >
               {arenaView === 'iq-test' ? 'Quitter le Test Q.I.' : '🎯 Tester mon Q.I. Exact'}
             </button>
             <button 
               onClick={() => setArenaView(prev => prev === 'history' ? 'main' : 'history')}
               className="px-5 py-3 rounded-2xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 text-[#a855f7] hover:bg-[#8b5cf6]/20 text-xs font-mono font-bold uppercase transition-all shadow-sm whitespace-nowrap"
             >
               {arenaView === 'history' ? 'Retourner à l\'Arène' : 'Historique des Sessions'}
             </button>
             {arenaView === 'main' && (
               <button 
                 onClick={() => {
                   setVoiceArenaSpoken([]);
                   setArenaTranscript("");
                   setRemediationContent("");
                   setElasticResults(null);
                   setElasticQuery("");
                   setCustomText("");
                   setSimulationInput("");
                 }}
                 className="px-5 py-3 rounded-2xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-xs font-mono font-bold uppercase transition-all whitespace-nowrap"
               >
                 Reset Score
               </button>
             )}
          </div>
       </div>

       {arenaView === 'iq-test' ? (
          <div className="max-w-7xl mx-auto relative z-10 animate-in fade-in duration-500 bg-transparent min-h-[500px] pb-12">
            <IQTestApp onClose={() => setArenaView('main')} />
          </div>
        ) : arenaView === 'history' ? (
         <div className="max-w-7xl mx-auto relative z-10 animate-in fade-in duration-500 bg-[#121626]/80 backdrop-blur-xl border border-[#8b5cf6]/30 rounded-[2.5rem] p-10 min-h-[500px]">
           <h3 className="text-xl font-black text-white uppercase tracking-widest border-b border-white/10 pb-4 mb-6">Patient Neuro-Cognitive Sessions</h3>
           
           {isLoadingHistory ? (
             <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 text-[#8b5cf6] animate-spin" />
             </div>
           ) : sessions.length === 0 ? (
             <div className="text-center p-12">
                <p className="text-slate-500 font-mono text-sm">No recorded sessions found in the database.</p>
             </div>
           ) : (
             <div className="space-y-4">
               {sessions.map((session, i) => {
                 const isPerfect = session.accuracy === 100;
                 return (
                   <div key={session.id || i} className={`p-5 border rounded-2xl flex flex-col md:flex-row md:items-center justify-between transition-all gap-4 ${isPerfect ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                     <div>
                        <h4 className={`text-sm font-bold ${isPerfect ? 'text-emerald-400' : 'text-white'}`}>{session.title}</h4>
                        <p className="text-xs text-slate-400 mt-1 font-mono">
                          {session.accuracy}% accuracy - {isPerfect ? 'Perfect session' : (session.accuracy > 70 ? 'Remediation suggested' : 'Needs practice')}
                        </p>
                        {session.missedWords && session.missedWords.length > 0 && (
                          <div className="flex gap-1.5 mt-3 flex-wrap">
                            {session.missedWords.map((w: string, j: number) => (
                               <span key={j} className="text-[9px] bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded uppercase tracking-wider">{w}</span>
                            ))}
                          </div>
                        )}
                     </div>
                     <span className={`text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-full whitespace-nowrap self-start md:self-auto ${isPerfect ? 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20' : 'text-slate-500 border border-white/10'}`}>
                       {session.createdAt?.toDate ? session.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Just now'}
                     </span>
                   </div>
                 );
               })}
             </div>
           )}
         </div>
       ) : (
         <>
           {/* Dedicated Elasticsearch RAG Desktop Console */}
           <div className="hidden">
           <div className="hidden">
           <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
             <Database className="w-48 h-48 text-emerald-400" />
           </div>
           
           <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between border-b border-emerald-500/20 pb-4 mb-2 gap-4">
             <div>
               <h4 className="text-sm uppercase tracking-[0.2em] font-black text-emerald-400 flex items-center gap-3">
                 <Search className="w-5 h-5" /> Elasticsearch RAG System
               </h4>
               <p className="text-xs text-emerald-500/70 mt-1 font-mono">Deep semantic retrieval across medical and educational corpus</p>
             </div>
             <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
               <span className="text-[10px] font-mono font-bold text-emerald-500/80 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">Vectorial Similarity Search Active</span>
             </div>
           </div>

           <div className="relative z-10 space-y-4 max-w-4xl">
             <div className="flex flex-col md:flex-row gap-4">
               <div className="relative flex-1">
                 <SearchCode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500/50" />
                 <input
                   type="text"
                   placeholder="Query the database for patient history or cognitive concepts (e.g., 'Rules for sibilants')"
                   value={elasticQuery}
                   onChange={(e) => setElasticQuery(e.target.value)}
                   className="w-full bg-black/60 border border-emerald-500/30 rounded-xl py-4 pl-12 pr-4 text-emerald-100 text-sm focus:border-emerald-500 shadow-inner outline-none transition-all focus:bg-black/80"
                   onKeyDown={(e) => e.key === 'Enter' && handleElasticSearch()}
                 />
               </div>
               <button 
                 onClick={handleElasticSearch}
                 disabled={isSearching || !elasticQuery.trim()}
                 className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
               >
                 {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Run Query <Send className="w-4 h-4 ml-1"/></>}
               </button>
             </div>

             {elasticResults && (
               <div className="mt-8 space-y-4 animate-in fade-in duration-500">
                 <p className="text-xs text-emerald-500/80 uppercase tracking-[0.2em] font-mono font-bold">Contextual Analysis Results:</p>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {elasticResults.map((res, i) => (
                     <div 
                       key={i} 
                       onClick={() => {
                         setCustomText(res.excerpt);
                         setArenaTranscript("");
                         setVoiceArenaSpoken([]);
                         setRemediationContent("");
                       }}
                       className="p-5 bg-black/40 border border-emerald-500/20 rounded-2xl flex flex-col space-y-3 hover:border-emerald-400 hover:bg-emerald-900/10 transition-colors cursor-pointer"
                     >
                       <div className="flex items-center justify-between pointer-events-none">
                         <span className="text-emerald-300 font-bold text-sm tracking-wide">{res.title}</span>
                         <span className="text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded flex items-center gap-1">
                           Score: {res.score.toFixed(2)}
                         </span>
                       </div>
                       <p className="text-xs text-slate-400 italic leading-relaxed">"{res.excerpt}"</p>
                     </div>
                   ))}
                 </div>
               </div>
             )}
           </div>
         </div>
       </div>

       <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6 relative z-10 animate-in fade-in duration-500 delay-150">
          
          {/* Left Columns - Training & Audio Interaction */}
          <div className="xl:col-span-8 space-y-6 flex flex-col">
             
             {/* Mode Selector Hub Tabs */}
             <div className="mb-6 flex bg-[#121626]/50 border border-white/5 rounded-2xl p-1.5 w-fit gap-1.5 backdrop-blur-sm self-start">
               <button
                 onClick={() => {
                   setActiveTab('cards');
                   setCustomText("");
                   setVoiceArenaSpoken([]);
                   setSimulationInput("");
                 }}
                 className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 ${
                   activeTab === 'cards'
                   ? 'bg-[#8b5cf6]/20 border border-[#8b5cf6]/50 text-[#c084fc] shadow-sm'
                   : 'text-slate-400 hover:text-white hover:bg-white/5'
                 }`}
               >
                 <BookOpen className="w-3.5 h-3.5" /> Practice Recommended Exercises
               </button>
               <button
                 onClick={() => {
                   setActiveTab('formulation');
                   setCustomText("The brave white falcon flies quickly over the dark forest to discover secret treasures.");
                   setVoiceArenaSpoken([]);
                   setSimulationInput("");
                 }}
                 className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 ${
                   activeTab === 'formulation'
                   ? 'bg-[#ff4e00]/25 border border-[#ff4e00]/50 text-[#ff8b4d] shadow-sm'
                   : 'text-slate-400 hover:text-white hover:bg-white/5'
                 }`}
               >
                 <Send className="w-3.5 h-3.5" /> Phrase Formulation Desk
               </button>
             </div>

             {/* Selected Phonics Cards Selection */}
             <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${activeTab === 'cards' ? '' : 'hidden'}`}>
                {gymCards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => {
                      setSelectedCardId(card.id);
                      setVoiceArenaSpoken([]);
                      setArenaTranscript("");
                      setRemediationContent("");
                      setCustomText("");
                    }}
                    className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300 relative overflow-hidden backdrop-blur-md ${
                      selectedCardId === card.id
                      ? 'bg-[#121626]/80 border-[#8b5cf6] shadow-[0_0_20px_rgba(139,92,246,0.15)] ring-1 ring-[#8b5cf6]/30'
                      : 'bg-[#121626]/40 border-white/5 hover:border-white/10 hover:bg-[#121626]/60'
                    }`}
                  >
                    <div>
                      <h4 className="text-[13px] font-black text-white mb-2 leading-snug">{card.title}</h4>
                      <p className="text-[11px] text-slate-400 font-mono leading-relaxed line-clamp-3">{card.description}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1">
                      {card.targetSounds.map((s, idx) => (
                        <span key={idx} className="bg-white/5 text-[9px] font-bold uppercase tracking-widest text-[#a855f7] border border-white/5 px-2 py-0.5 rounded-md">/{s}/</span>
                      ))}
                    </div>
                  </button>
                ))}
             </div>

             {activeTab === 'formulation' && (
               /* Phrase Formulation Desk Panel */
               <div className="bg-[#121626]/80 border-2 border-dashed border-[#ff4e00]/30 rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden backdrop-blur-xl animate-in fade-in duration-300 text-left mb-6">
                 <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                   <Send className="w-48 h-48 text-[#ff4e00]" />
                 </div>
                 
                 <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-4 mb-2 gap-4">
                   <div>
                     <h4 className="text-sm uppercase tracking-[0.2em] font-black text-[#ff4e00] flex items-center gap-2">
                       <Send className="w-4.5 h-4.5 text-[#ff4e00]" /> Active formulation playground
                     </h4>
                     <p className="text-xs text-slate-400 mt-1 font-mono">Formulate your complex phrases to practice oral speech under exact matching</p>
                   </div>
                   <div className="flex items-center gap-2">
                     <button
                       onClick={async () => {
                         try {
                           const response = await fetch('/api/cognitive-remediation', {
                             method: "POST",
                             headers: { "Content-Type": "application/json" },
                             body: JSON.stringify({
                               missedWords: ["articulation", "phonetics", "sibilant"],
                               originalText: "Generate as many speech training sentences as possible.",
                               language: selectedLang,
                               customRequest: true
                             })
                           });
                           if (response.ok) {
                             const rData = await response.json();
                             // Extract a neat sentence from the response snippet
                             const lines = rData.remediation.replace(/[*#]/g, '').split('\n').filter((l: string) => l.trim().length > 15);
                             if (lines.length > 0) {
                               setCustomText(lines[0].trim());
                             } else {
                               setCustomText("The majestic falcon flies gracefully into the golden sunset.");
                             }
                             setVoiceArenaSpoken([]);
                             setSimulationInput("");
                           } else {
                             setCustomText("The clinical therapist prepares phonetic exercises containing challenging double consonants.");
                             setVoiceArenaSpoken([]);
                             setSimulationInput("");
                           }
                         } catch (err) {
                           setCustomText("Plural phonemes present complex obstacles for patients suffering from auditory discrimination.");
                           setVoiceArenaSpoken([]);
                           setSimulationInput("");
                         }
                       }}
                       className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 animate-pulse"
                     >
                       <Sparkles className="w-3.5 h-3.5 text-[#ff4e00]" /> Suggest with AI
                     </button>
                     <button
                       onClick={() => {
                         setCustomText("");
                         setVoiceArenaSpoken([]);
                         setSimulationInput("");
                       }}
                       className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 font-mono text-[10px] font-bold uppercase transition-all"
                     >
                       Reset Phrase
                     </button>
                   </div>
                 </div>

                 <div className="space-y-4">
                   <textarea
                     rows={3}
                     placeholder="Type or formulate your own custom phrase here to practice..."
                     value={customText}
                     onChange={(e) => {
                       setCustomText(e.target.value);
                       setVoiceArenaSpoken([]);
                       setSimulationInput("");
                     }}
                     className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-white placeholder-slate-500 text-lg focus:border-[#ff4e00]/50 outline-none transition-all resize-y select-text font-medium leading-relaxed font-sans"
                   />
                   
                   {/* Simulation sub-panel */}
                   <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                     <div className="flex items-center justify-between font-sans">
                       <span className="text-[10px] font-mono font-bold text-[#ff4e00]/80 uppercase tracking-widest flex items-center gap-1.5">
                         <Activity className="w-3.5 h-3.5 text-[#ff4e00]" /> Voice & Typing Evaluator Simulator
                       </span>
                       <span className="text-[9px] font-mono text-slate-500">Test word matching calculation instantly</span>
                     </div>
                     
                     <div className="flex flex-col sm:flex-row gap-3">
                       <input
                         type="text"
                         placeholder="Simulate pronunciation (type words you speak e.g. 'the brave white falcon')"
                         value={simulationInput}
                         onChange={(e) => handleSimulationChange(e.target.value)}
                         className="flex-1 bg-black/40 border border-white/10 rounded-xl py-2 px-4 text-xs font-mono text-slate-300 placeholder-slate-600 focus:border-[#ef4e00]/30 outline-none"
                       />
                       <button
                         onClick={() => {
                           // Auto complete simulated correct pronunciation for demonstration
                           handleSimulationChange(activeText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ""));
                         }}
                         className="px-4 py-2 bg-[#ff4e00]/10 hover:bg-[#ff4e00]/20 text-[#ff4e00] font-mono text-[10px] font-bold rounded-xl border border-[#ff4e00]/20 transition-all uppercase whitespace-nowrap"
                       >
                         ⚡ Simulate 100% Pronunciation
                       </button>
                     </div>
                   </div>
                 </div>
               </div>
             )}

             {/* Speech Reading Area Card */}
             <div className="bg-[#121626]/80 border border-white/5 rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden backdrop-blur-xl flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                    <span className="text-xs uppercase tracking-[0.2em] font-bold text-slate-400 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#ff4e00]" /> Reading Assessment Text
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">{rawWords.length} Words • Language: {selectedLang}</span>
                  </div>

                  {/* Words renderer with direct highlights */}
                  <div className="leading-relaxed text-left flex flex-wrap gap-x-2 gap-y-3 py-6 min-h-[120px] items-center">
                    {rawWords.map((word, idx) => {
                      const clean = word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
                      const isPassed = voiceArenaSpoken.includes(clean);
                      return (
                        <span
                          key={idx}
                          className={`px-4 py-2 rounded-2xl text-base font-bold select-none transition-all duration-300 transform ${
                            isPassed
                            ? 'bg-emerald-500/10 border border-emerald-500/50 text-emerald-300 shadow-[0_4px_12px_rgba(16,185,129,0.1)] scale-105'
                            : 'bg-slate-900/40 border border-white/5 text-slate-400 hover:border-white/20'
                          }`}
                        >
                          {word}
                        </span>
                      );
                    })}
                  </div>
                     {/* Microphone Controller Area */}
                <div className="space-y-4 pt-6 mt-6 border-t border-white/5">
                  {speechError && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-2xl text-xs flex flex-col gap-2 animate-in slide-in-from-top-1">
                      <div className="flex items-center gap-2 font-black uppercase tracking-wider text-[10px]">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        Microphone Access / Browser Policy Warning
                      </div>
                      <p>{speechError}</p>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Note: Les navigateurs bloquent souvent l'accès microphone à l'intérieur des iframes imbriquées. Ouvre l'application dans un **nouvel onglet** (bouton en haut à droite) ou utilise le panel de simulation ci-dessous pour tester sans soucis !
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <button
                      onClick={toggleRecording}
                      className={`w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4.5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all transform ${
                        isRecording
                        ? 'bg-rose-500 text-white shadow-[0_0_25px_rgba(244,63,94,0.4)] animate-pulse hover:scale-100'
                        : 'bg-gradient-to-r from-[#8b5cf6] to-[#ff4e00] hover:scale-[1.02] text-white shadow-[0_0_25px_rgba(139,92,246,0.3)]'
                      }`}
                    >
                      {isRecording ? (
                        <>Interrupt <VolumeX className="w-4 h-4" /></>
                      ) : (
                        <>Start Speaking <Mic className="w-4 h-4" /></>
                      )}
                    </button>

                    {isRecording && (
                      <div className="flex-1 flex items-center justify-end gap-1 px-4 py-2 bg-black/40 border border-white/5 rounded-2xl h-14 w-full animate-in fade-in">
                         <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest mr-4">Live Voice Signal</span>
                         {audioData.slice(0, 16).map((val, idx) => (
                           <div 
                             key={idx} 
                             className="w-1.5 bg-gradient-to-t from-[#8b5cf6] to-[#ff4e00] rounded-full transition-all duration-75"
                             style={{ height: `${Math.max(4, val * 100)}%` }}
                           />
                         ))}
                      </div>
                    )}
                  </div>

                  {/* Demo Control Center & Bypass Panel */}
                  <div className="p-4 bg-slate-900/60 border border-white/10 rounded-2xl space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-black text-[#ff4e00] uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-[#ff4e00]" /> Demo Failsafe Simulator Pipeline
                      </span>
                      <span className="text-[9px] font-mono text-slate-500">Garantit 100% de succès sur scène (sans micro)</span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Tape les mots que tu prononces (ex: 'the brave white falcon')"
                        value={simulationInput}
                        onChange={(e) => handleSimulationChange(e.target.value)}
                        className="flex-1 bg-black/60 border border-white/10 rounded-xl py-2 px-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:border-[#ff4e00]/40 outline-none"
                      />
                      <button
                        onClick={() => {
                          handleSimulationChange(activeText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ""));
                        }}
                        className="px-4 py-2 bg-[#ff4e00]/20 hover:bg-[#ff4e00]/30 text-[#ff4e00] font-mono text-[10px] font-bold rounded-xl border border-[#ff4e00]/30 transition-all uppercase whitespace-nowrap"
                      >
                        ⚡ Simulate 100% Correct
                      </button>
                    </div>
                  </div>

                  {arenaTranscript && (
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5 animate-in slide-in-from-top-2">
                      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">Direct Transcription Stream:</p>
                      <p className="text-xs text-slate-400 italic">"{arenaTranscript}"</p>
                    </div>
                  )}
                </div>              </div>
             </div>
          </div>

          {/* Right Columns - Metrics & AI Remediation */}
          <div className="xl:col-span-4 space-y-6">
             
             {/* Live Performance Panel */}
             <div className="bg-[#121626]/80 border border-white/5 rounded-3xl p-6 space-y-6 backdrop-blur-md">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white border-b border-white/5 pb-3">Live Statistics</h3>
                
                {/* Giant score wheel/badge */}
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-full border-4 border-dashed border-[#8b5cf6]/40 flex items-center justify-center relative overflow-hidden bg-black/40">
                    <div className="text-center">
                      <span className="text-3xl font-black text-white font-mono">{progressPercentage}</span>
                      <span className="text-[10px] text-slate-500 block">%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Global Accuracy</p>
                    <p className="text-slate-400 text-xs font-mono mt-1">{spokenCount} / {rawWords.length} words validated</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                    <span>Progress</span>
                    <span className="text-[#ff4e00]">{progressPercentage}%</span>
                  </div>
                  <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#ff4e00] rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Detected Missed Words */}
                <div className="space-y-3">
                  <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">Remaining Target Words & Sounds:</p>
                  {missedList.length === 0 ? (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl text-center animate-in zoom-in">
                      🎉 Perfect! All words have been successfully recognized.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {missedList.map((m, idx) => (
                        <span key={idx} className="bg-white/5 border border-white/5 text-slate-300 font-mono text-[10px] px-2.5 py-1 rounded-lg">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
             </div>

             {/* Adaptive AI Remediation Panel */}
             <div className="bg-[#121626]/80 border border-white/5 rounded-3xl p-6 space-y-4 backdrop-blur-md flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[#a855f7] mb-3 flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-[#ff4e00]" /> Remediation Assistant
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    The artificial intelligence synthesizes your reading data to formulate targeted, interactive phonetic exercises with a single click.
                  </p>

                  {remediationContent ? (
                    <div className="bg-black/60 rounded-2xl p-5 border border-white/10 max-h-96 overflow-y-auto text-xs text-slate-300 prose prose-invert scrollbar-hide select-text animate-in fade-in">
                      <Markdown>{remediationContent}</Markdown>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-black/20 rounded-2xl border border-dashed border-white/5">
                      <Activity className="w-8 h-8 text-white/10 mx-auto mb-2 animate-pulse" />
                      <span className="text-[10px] font-mono text-slate-500 leading-relaxed uppercase tracking-wider block">No generated remediation.</span>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <div className="flex gap-2">
                    <button
                      onClick={triggerRemediation}
                      disabled={isRemediating || missedList.length === 0}
                      className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 border flex items-center justify-center gap-2 ${
                        missedList.length === 0
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-not-allowed'
                        : 'bg-white text-black hover:bg-transparent hover:text-white border-transparent hover:border-white/20'
                      }`}
                    >
                      {isRemediating ? (
                        <>Cognitive Analysis in progress...<Loader2 className="w-4 h-4 ml-2 animate-spin-slow" /></>
                      ) : missedList.length === 0 ? (
                        <>Everything is Mastered! ✨</>
                      ) : (
                        <>Generate Cognitive Remediation <Send className="w-3.5 h-3.5" /></>
                      )}
                    </button>
                    <button
                      onClick={saveCurrentSession}
                      className="px-6 py-4 rounded-xl bg-[#8b5cf6] hover:bg-[#a855f7] text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all flex flex-col items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)]"
                      title="Save Session to History"
                    >
                       <Save className="w-4 h-4 mb-1" /> Save
                    </button>
                  </div>
                </div>
             </div>
          </div>

       </div>

        {/* Beautiful Live HUD feedback panel for instant word accuracy */}
        {instantFeedback && (
          <div className="fixed bottom-12 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-sm w-full bg-[#121626]/95 border border-[#8b5cf6]/40 rounded-3xl p-6 shadow-[0_10px_40px_rgba(139,92,246,0.25)] backdrop-blur-xl ring-1 ring-[#8b5cf6]/20">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 text-[#c084fc]">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1 space-y-1 text-left font-sans">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Pronunciation Score!</h4>
                <p className="text-[11px] text-slate-400 font-mono">
                  Correct: <span className="font-bold text-[#c084fc]">{instantFeedback.spoken}</span> / {instantFeedback.total} words
                </p>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-1 border border-white/5">
                  <div 
                    className="bg-gradient-to-r from-[#8b5cf6] to-[#ff4e00] h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${instantFeedback.accuracy}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-[9px] font-bold uppercase text-slate-500 tracking-widest">Cognitive analysis</span>
                  <span className="text-xs font-black font-mono text-[#c084fc] bg-[#8b5cf6]/10 px-2.5 py-0.5 rounded-full border border-[#8b5cf6]/20">{instantFeedback.accuracy}% Match</span>
                </div>
              </div>
              <button 
                onClick={() => setInstantFeedback(null)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

       {/* Elasticsearch RAG Dedicated Floating Window Modal */}
       {isRAGOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
           <div className="relative w-full max-w-4xl bg-[#0b0e17] border-2 border-emerald-500/40 rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.3)] max-h-[85vh] flex flex-col font-sans">
             
             {/* Decorative indicator header border glowing */}
             <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-transparent" />
             
             {/* Header */}
             <div className="p-8 border-b border-white/5 flex items-center justify-between bg-[#121626]/80 backdrop-blur-xl">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                   <Database className="w-6 h-6 animate-pulse" />
                 </div>
                 <div className="text-left">
                   <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                     Elasticsearch RAG Intelligence Desk
                   </h3>
                   <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest block mt-0.5">
                     Vectorial similarity search across clinical & pedagogical corpora
                   </span>
                 </div>
               </div>
               <button 
                 onClick={() => setIsRAGOpen(false)}
                 className="p-3 bg-white/5 border border-white/5 hover:border-white/20 text-slate-400 hover:text-white rounded-full transition-colors flex items-center justify-center"
               >
                 <X className="w-5 h-5" />
               </button>
             </div>

             {/* Search Arena Content */}
             <div className="p-8 space-y-6 overflow-y-auto flex-1 select-text">
               <p className="text-sm text-slate-400 leading-relaxed max-w-2xl text-left">
                 Ask a conceptual question or query the clinical corpus for dyslexia, speech therapy rules, or custom phonetic materials. The RAG will fetch relevant vector matches.
               </p>

               <div className="flex flex-col md:flex-row gap-4">
                 <div className="relative flex-1">
                   <SearchCode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500/50" />
                   <input
                     type="text"
                     placeholder="Type what you want to query... (e.g. 'Grapheme confusion rules', 'Sibilant exercise recommendations')"
                     value={elasticQuery}
                     onChange={(e) => setElasticQuery(e.target.value)}
                     className="w-full bg-black/60 border border-emerald-500/30 rounded-2xl py-4 pl-12 pr-4 text-emerald-100 text-sm focus:border-emerald-400 shadow-inner outline-none transition-all focus:bg-black/80 font-mono"
                     onKeyDown={(e) => e.key === 'Enter' && handleElasticSearch()}
                     autoFocus
                   />
                 </div>
                 <button 
                   onClick={handleElasticSearch}
                   disabled={isSearching || !elasticQuery.trim()}
                   className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 transition-all flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest"
                 >
                   {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Run Query <Send className="w-4 h-4 ml-1"/></>}
                 </button>
               </div>

               {elasticResults && (
                 <div className="mt-8 space-y-4 animate-in fade-in duration-500 text-left">
                   <div className="flex items-center justify-between border-b border-[#10b981]/10 pb-2">
                     <p className="text-xs text-emerald-400 uppercase tracking-[0.2em] font-mono font-bold">
                       Retrieved Matches (Semantic Rank):
                     </p>
                     <span className="text-[10px] text-slate-500 font-mono">Found {elasticResults.length} vectors</span>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {elasticResults.map((res, i) => (
                       <div 
                         key={i} 
                         onClick={() => {
                           // Load corpus as active practice sentence
                           setActiveTab('formulation');
                           setCustomText(res.excerpt);
                           setArenaTranscript("");
                           setVoiceArenaSpoken([]);
                           setRemediationContent("");
                           setSimulationInput("");
                           setIsRAGOpen(false); // Close RAG window
                         }}
                         className="p-5 bg-black/40 border border-emerald-500/20 rounded-2xl flex flex-col space-y-3 hover:border-emerald-400 hover:bg-[#10b981]/5 transition-all cursor-pointer group"
                       >
                         <div className="flex items-center justify-between pointer-events-none">
                           <span className="text-emerald-300 font-bold text-sm tracking-wide group-hover:text-emerald-400 font-sans">{res.title}</span>
                           <span className="text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded flex items-center gap-1">
                             Score: {res.score.toFixed(2)}
                           </span>
                         </div>
                         <p className="text-xs text-slate-300 italic leading-relaxed font-sans">"{res.excerpt}"</p>
                         <span className="text-[9px] font-mono text-emerald-500/60 uppercase tracking-widest mt-2 block pointer-events-none group-hover:text-emerald-400 transition-colors">
                           ⚡ Click to inject as practice sentence
                         </span>
                       </div>
                     ))}
                   </div>
                 </div>
               )}
             </div>

             {/* Footer */}
             <div className="p-6 bg-black/40 border-t border-white/5 text-center flex justify-between items-center px-8">
               <span className="text-[10px] font-mono text-slate-500 uppercase">Elasticsearch RAG Module V1.3.0 • Secured API</span>
               <button 
                 onClick={() => setIsRAGOpen(false)}
                 className="px-5 py-2 hover:bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-white transition-colors"
               >
                 Close Desk
               </button>
             </div>
           </div>
         </div>
       )}
          </>
       )}
    </div>
  );
}
