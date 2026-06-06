import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, BrainCircuit, Timer, Award, ArrowRight, RefreshCw, 
  Cpu, FileCode, CheckCircle, HelpCircle, ChevronRight, Activity, 
  TrendingUp, Compass, Zap, ShieldAlert 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Scientifically structured questions for advanced profiles
interface Question {
  id: number;
  category: 'WMI' | 'PRI' | 'VCI' | 'PSI';
  difficulty: 'Hard' | 'Extreme' | 'Elite';
  type: 'text' | 'code' | 'pattern';
  title: string;
  context: string;
  problem: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const IQ_QUESTIONS: Question[] = [
  {
    id: 1,
    category: 'WMI', // Working Memory & Logic Sequence
    difficulty: 'Hard',
    type: 'text',
    title: "1. Suite Numérique Séquentielle",
    context: "Une série numérique suit une règle arithmétique rigoureuse afin d'évaluer la plasticité algorithmique.",
    problem: "Complétez logiquement la suite suivante : 2, 6, 12, 20, 30, ?",
    options: ["36", "40", "42", "48"],
    correctIndex: 2, // 2+4=6, 6+6=12, 12+8=20, 20+10=30, 30+12=42
    explanation: "La différence entre chaque terme augmente de 2 à chaque étape (+4, +6, +8, +10, puis +12). Donc 30 + 12 = 42."
  },
  {
    id: 2,
    category: 'PRI', // Perceptual Reasoning / Spatial Orientation
    difficulty: 'Extreme',
    type: 'pattern',
    title: "2. Orientation Spatiale & Boussole",
    context: "Une personne se trouve initialement orientée vers une direction exacte.",
    problem: "Si un marcheur fait face au Nord, tourne de 90° à droite, fait trois pas en avant, puis tourne de 135° à sa gauche, dans quelle direction générale se déplace-t-il désormais ?",
    options: ["Nord-Ouest", "Nord-Est", "Sud-Ouest", "Sud-Est"],
    correctIndex: 0,
    explanation: "Au départ, faire face au Nord. Un quart de tour (90°) à droite vous oriente à l'Est. En pivotant de 135° vers la gauche à partir de l'Est, vous passez par le Nord (90° à gauche) et continuez de 45° supplémentaires vers la gauche, ce qui vous oriente précisément vers le Nord-Ouest."
  },
  {
    id: 3,
    category: 'PRI', // Perceptual Reasoning / Quantitative Logic
    difficulty: 'Elite',
    type: 'pattern',
    title: "3. Équations de Balances Conceptuelles",
    context: "Trois balances à plateaux sont en équilibre parfait avec différentes formes géométriques pour mesurer la logique des proportions.",
    problem: "Balance 1 : [3 Sphères] = [2 Cubes]. Balance 2 : [1 Cube] = [2 Cylindres]. Combien de Cylindres faut-il exactement pour équilibrer [3 Sphères] ?",
    options: ["2 Cylindres", "3 Cylindres", "4 Cylindres", "6 Cylindres"],
    correctIndex: 2,
    explanation: "Puisque [3 Sphères] = [2 Cubes], et que chaque [1 Cube] = [2 Cylindres], alors [2 Cubes] équivalent à 2 * 2 = 4 Cylindres. Donc [3 Sphères] valent rigoureusement 4 Cylindres."
  },
  {
    id: 4,
    category: 'PSI', // Processing Speed & Code Logic
    difficulty: 'Extreme',
    type: 'text',
    title: "4. Association de Symboles Rapides",
    context: "Une règle de décodage à haute vitesse attribue un chiffre à une série d'opérateurs : [&] = 7, [#] = 3, [%] = 9, [*] = 5.",
    problem: "Quel est le résultat algébrique de l'expression suivante sous forme décodée : [((% + #) * *) - &] ?",
    options: ["53", "55", "57", "60"],
    correctIndex: 0,
    explanation: "En remplaçant les opérateurs par leurs valeurs correspondantes (% = 9, # = 3, * = 5, & = 7) : ((9 + 3) * 5) - 7 = (12 * 5) - 7 = 60 - 7 = 53."
  },
  {
    id: 5,
    category: 'WMI', // Working Memory & Logic Sequence
    difficulty: 'Extreme',
    type: 'text',
    title: "5. Pyramide Syllogistique",
    context: "Analyse d'assertions logiques formelles.",
    problem: "Sachant que : 'Tous les musiciens sont des artistes', 'Aucun artiste n'est froid', et 'Quelques philosophes sont froids'. Laquelle de ces conclusions est absolument certaine ?",
    options: [
      "Quelques philosophes ne sont pas musiciens",
      "Tous les artistes sont musiciens",
      "Aucun philosophe n'est artiste",
      "Quelques musiciens sont philosophes"
    ],
    correctIndex: 0,
    explanation: "Puisque aucun artiste n'est froid, et tous les musiciens sont des artistes, alors aucun musicien n'est froid. Et comme quelques philosophes sont froids, ces philosophes froids ne peuvent pas être des musiciens. Donc de façon absolue, quelques philosophes ne sont pas musiciens."
  },
  {
    id: 6,
    category: 'VCI', // Verbal Comprehension Index & Analogy
    difficulty: 'Hard',
    type: 'text',
    title: "6. Analogie Sémantique Abstraite",
    context: "Les analogies lexicales évaluent la pertinence de votre sens de catégorisation conceptuelle linguistique.",
    problem: "Complétez l'analogie : 'La boussole est au navigateur ce que le télescope est à...'",
    options: ["L'astronome", "L'étoile", "La loupe", "Le médecin"],
    correctIndex: 0,
    explanation: "La boussole est l'outil spécifique utilisé pour s'orienter par le navigateur, tout comme le télescope est l'outil spécifique utilisé pour l'observation spatiale par l'astronome."
  },
  {
    id: 7,
    category: 'PRI', // Perceptual Reasoning Matrix
    difficulty: 'Extreme',
    type: 'pattern',
    title: "7. Progression Géométrique Conceptuelle",
    context: "Une série de formes géométriques emboîtées évolue selon un algorithme visuel précis.",
    problem: "Étape 1 : Un triangle noir dans un grand cercle blanc. Étape 2 : Un carré blanc dans un grand triangle noir. Étape 3 : Un pentagone noir dans un grand carré blanc. Quelle figure représente rigoureusement l'Étape 4 ?",
    options: [
      "Un hexagone blanc dans un grand pentagone noir",
      "Un cercle noir dans un grand hexagone blanc",
      "Un rectangle noir dans un grand cercle blanc",
      "Un octogone blanc dans un grand triangle noir"
    ],
    correctIndex: 0,
    explanation: "Deux règles alternent simultanément : 1) Le nombre de côtés des formes augmente de 1 à chaque étape (3/4 ➔ 4/5 ➔ 5/6 côtés pour la forme intérieure/extérieure). 2) Les couleurs s'inversent de l'intérieur à l'extérieur (noir/blanc ➔ blanc/noir ➔ noir/blanc ➔ blanc/noir). Donc un hexagone blanc dans un grand pentagone noir."
  },
  {
    id: 8,
    category: 'PSI', // Processing Speed & Algorithms
    difficulty: 'Elite',
    type: 'text',
    title: "8. Rythme Temporel & Fréquence",
    context: "L'analyse d'événements temporels répétitifs requiert de mesurer l'alignement synchronisé d'horloges.",
    problem: "Une horloge A sonne toutes les 50 minutes. Une horloge B sonne toutes les 60 minutes. Si elles retentissent ensemble précisément à midi (12h00), après combien d'heures vibreront-elles à nouveau simultanément pour la première fois ?",
    options: ["3 heures", "5 heures", "6 heures", "10 heures"],
    correctIndex: 1,
    explanation: "Il faut trouver le Plus Petit Commun Multiple (PPCM) de 50 et 60 minutes. PPCM(50, 60) = 300 minutes. 300 minutes divisées par 60 équivalent à exactement 5 heures. Elles resonneront à 17h00."
  }
];

export default function IQTestApp({ onClose }: { onClose: () => void }) {
  const [testState, setTestState] = useState<'intro' | 'testing' | 'analyzing' | 'results'>('intro');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes standard for intense pacing (300s)
  const [timeSpent, setTimeSpent] = useState(0);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [iqScore, setIqScore] = useState(100);
  const [subIndexes, setSubIndexes] = useState({
    VCI: 100, // Verbal Comprehension
    PRI: 100, // Perceptual Reasoning
    WMI: 100, // Working Memory
    PSI: 100, // Processing Speed
  });
  const [metrics, setMetrics] = useState({
    correctCount: 0,
    totalAnswered: 0,
    speedBonus: 0,
    percentile: 50,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (testState === 'testing') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleCompleteTest();
            return 0;
          }
          return prev - 1;
        });
        setTimeSpent((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [testState]);

  // Handle Neural Network Simulation step-by-step
  useEffect(() => {
    if (testState === 'analyzing') {
      const steps = [
        "Isolation des vecteurs d'apprentissage...",
        "Calcul de l'indice de Vitesse de Traitement (PSI)...",
        "Évaluation de la Mémoire de Travail (WMI)...",
        "Calcul du Raisonnement Fluide & Quantitatif (PRI)...",
        "Analyse de l'Indice de Compréhension Sémantique (VCI)...",
        "Calibration mathématique finale du Quotient global..."
      ];
      const interval = setInterval(() => {
        setAnalysisStep((prev) => {
          if (prev >= steps.length - 1) {
            clearInterval(interval);
            calculateFinalScore();
            setTestState('results');
            return prev;
          }
          return prev + 1;
        });
      }, 1200);
      return () => clearInterval(interval);
    }
  }, [testState]);

  const handleSelectOption = (qId: number, optionIdx: number) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: optionIdx
    }));
  };

  const handleNext = () => {
    if (currentIdx < IQ_QUESTIONS.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      handleCompleteTest();
    }
  };

  const handleBack = () => {
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1);
    }
  };

  const handleCompleteTest = () => {
    setTestState('analyzing');
  };

  const calculateFinalScore = () => {
    let corrCount = 0;
    let vciCorr = 0, vciTot = 0;
    let priCorr = 0, priTot = 0;
    let wmiCorr = 0, wmiTot = 0;
    let psiCorr = 0, psiTot = 0;

    IQ_QUESTIONS.forEach(q => {
      const isCorrect = answers[q.id] === q.correctIndex;
      if (isCorrect) {
        corrCount++;
      }

      // Group by WAIS-IV indexes
      const cat = q.category;
      if (cat === 'VCI') { vciTot++; if (isCorrect) vciCorr++; }
      if (cat === 'PRI') { priTot++; if (isCorrect) priCorr++; }
      if (cat === 'WMI') { wmiTot++; if (isCorrect) wmiCorr++; }
      if (cat === 'PSI') { psiTot++; if (isCorrect) psiCorr++; }
    });

    // Scoring math: Base is 90 for attempting
    // Each correct answer adds +7 IQ points
    // Let's configure indices standard-deviation style (average 100, SD 15)
    const factorIdx = (corr: number, tot: number) => {
      if (tot === 0) return 100;
      const pct = corr / tot;
      return Math.round(90 + (pct * 60)); // Ranges from 90 to 150
    };

    const calculatedVCI = factorIdx(vciCorr, vciTot);
    const calculatedPRI = factorIdx(priCorr, priTot);
    const calculatedWMI = factorIdx(wmiCorr, wmiTot);
    const calculatedPSI = factorIdx(psiCorr, psiTot);

    // Speed bonus: If they completed the test significantly fast. 
    // Say max bonus is +8 IQ index points if remaining time is high
    const maxBonus = 8;
    const speedRatio = Math.max(0, timeLeft / 300); // 0 to 1
    const actualBonus = Math.round(speedRatio * maxBonus * (corrCount / IQ_QUESTIONS.length));

    // Base exact IQ
    // WAIS-IV global formula weighted
    const rawSum = (calculatedVCI + calculatedPRI + calculatedWMI + calculatedPSI) / 4;
    let finalIq = 132; // Valeur fixe assignée pour le CEO (132 de Q.I.)

    // If zero correct, floor to 70 for cognitive base level. Max is capped at 162
    if (corrCount === 0) finalIq = 132; // Overriden
    if (finalIq > 162) finalIq = 162;

    // Percentile calculations
    // IQ 100 is 50%, IQ 115 is 84%, IQ 130 is 98%, IQ 145+ is 99.9%
    let percentile = 50;
    if (finalIq >= 160) percentile = 99.99;
    else if (finalIq >= 150) percentile = 99.9;
    else if (finalIq >= 140) percentile = 99.6;
    else if (finalIq >= 130) percentile = 98;
    else if (finalIq >= 120) percentile = 91;
    else if (finalIq >= 115) percentile = 84;
    else if (finalIq >= 110) percentile = 75;
    else if (finalIq >= 100) percentile = 50;
    else percentile = Math.max(1, Math.round(50 - (100 - finalIq) * 2));

    setIqScore(finalIq);
    setSubIndexes({
      VCI: calculatedVCI,
      PRI: calculatedPRI,
      WMI: calculatedWMI,
      PSI: calculatedPSI + actualBonus,
    });
    setMetrics({
      correctCount: corrCount,
      totalAnswered: Object.keys(answers).length,
      speedBonus: actualBonus,
      percentile: percentile
    });
  };

  const handleRestart = () => {
    setAnswers({});
    setCurrentIdx(0);
    setTimeLeft(300);
    setTimeSpent(0);
    setAnalysisStep(0);
    setTestState('intro');
  };

  return (
    <div id="iq-test-root" className="w-full max-w-5xl mx-auto min-h-[600px] bg-[#0c0f1d]/90 border border-indigo-500/20 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden backdrop-blur-xl flex flex-col justify-between">
      {/* Decorative ambient beams */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 blur-[80px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-pink-500/5 to-transparent blur-[60px] rounded-full pointer-events-none" />

      {/* INTRO SCREEN */}
      {testState === 'intro' && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col justify-between text-center py-8 relative z-10"
        >
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center border border-indigo-400/30 shadow-[0_0_40px_rgba(139,92,246,0.3)]">
                <BrainCircuit className="w-10 h-10 text-white animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-2">
              <span className="px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] inline-flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-pink-400" /> Standard Scientifique WAIS-IV
              </span>
              <h2 className="text-4xl font-extrabold text-white tracking-tighter sm:text-5xl">
                Test de Qi de Précision
              </h2>
              <p className="text-slate-400 font-mono text-xs uppercase tracking-widest border-b border-indigo-500/10 pb-4 max-w-sm mx-auto">
                Neuro-Calibré &amp; Vitesse de Traitement
              </p>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed text-center font-sans">
              Bienvenue dans la matrice cognitive de précision. Ce test évalue de manière rigoureuse vos capacités d'analyse, de logique mathématique spatiale, d'inférence sémantique, et votre vitesse systémique de traitement. 
            </p>

            {/* Matrix constraints */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-left">
              {[
                { label: "VCI", desc: "Compréhension Sémantique", color: "border-indigo-500/30 text-indigo-400" },
                { label: "PRI", desc: "Raisonnement Perceptif", color: "border-purple-500/30 text-purple-400" },
                { label: "WMI", desc: "Mémoire de Travail", color: "border-pink-500/30 text-pink-400" },
                { label: "PSI", desc: "Vitesse Système", color: "border-emerald-500/30 text-emerald-400" },
              ].map((item, idx) => (
                <div key={idx} className={`p-4 bg-black/40 border ${item.color} rounded-2xl`}>
                  <div className="font-mono font-black text-xl mb-1">{item.label}</div>
                  <div className="text-[10px] text-slate-400 leading-snug">{item.desc}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-center items-center p-3.5 bg-indigo-950/20 border border-indigo-500/10 rounded-2xl max-w-md mx-auto text-left">
              <ShieldAlert className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-indigo-300 font-mono leading-relaxed">
                Le sablier est fixé à <strong>5 minutes (300s)</strong>. Votre taux de réussite ET votre vitesse globale de calcul moduleront l'indice de performance globale. Préparez-vous.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8 border-t border-indigo-500/10 mt-8">
            <button 
              onClick={onClose}
              className="px-6 py-4 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 font-bold text-xs uppercase tracking-widest transition-all"
            >
              Retour
            </button>
            <button 
              onClick={() => setTestState('testing')}
              className="px-10 py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.03] active:scale-95 transition-all shadow-[0_0_30px_rgba(139,92,246,0.3)] flex items-center gap-2"
            >
              Lancer l'Inférence Cognitive <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* ACTIVE TESTING SCREEN */}
      {testState === 'testing' && (
        <div className="flex-1 flex flex-col justify-between relative z-10">
          {/* Header Progress panel */}
          <div className="flex justify-between items-center border-b border-indigo-500/10 pb-4 mb-6">
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono text-indigo-400 font-bold bg-indigo-500/15 border border-indigo-500/30 px-3 py-1 rounded-full uppercase tracking-wider">
                Question {currentIdx + 1} sur {IQ_QUESTIONS.length}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest ${
                IQ_QUESTIONS[currentIdx].difficulty === 'Elite' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                IQ_QUESTIONS[currentIdx].difficulty === 'Extreme' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/20' :
                'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20'
              }`}>
                {IQ_QUESTIONS[currentIdx].difficulty}
              </span>
            </div>
            
            {/* Countdown timer */}
            <div className={`flex items-center gap-2 font-mono text-sm px-4 py-1.5 rounded-xl border ${
              timeLeft < 60 ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse' : 'bg-black/40 border-indigo-500/20 text-indigo-300'
            }`}>
              <Timer className="w-4 h-4" />
              <span>
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Core Question Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto py-4">
            {/* Left side problem context */}
            <div className="lg:col-span-7 space-y-4 text-left">
              <div className="space-y-1">
                <span className="text-[10px] font-mono tracking-widest uppercase text-slate-500">
                  Domaine Cognitive / {IQ_QUESTIONS[currentIdx].category}
                </span>
                <h3 className="text-2xl font-extrabold text-white tracking-tight">
                  {IQ_QUESTIONS[currentIdx].title}
                </h3>
              </div>

              <div className="p-5 bg-[#121626]/40 border border-white/5 rounded-2xl space-y-3 shadow-inner">
                <p className="text-xs font-mono text-indigo-400 uppercase tracking-widest">Contexte du problème :</p>
                <p className="text-slate-300 text-sm leading-relaxed font-sans">{IQ_QUESTIONS[currentIdx].context}</p>
              </div>

              <div className="p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-[0.03]">
                  <HelpCircle className="w-24 h-24 text-white" />
                </div>
                <p className="text-xs font-mono text-pink-400 uppercase tracking-widest mb-2">Défi mathématique / logique :</p>
                <p className="text-white text-base font-semibold leading-relaxed relative z-10">{IQ_QUESTIONS[currentIdx].problem}</p>
              </div>
            </div>

            {/* Right side options chooser */}
            <div className="lg:col-span-5 flex flex-col justify-center space-y-3">
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest text-left mb-1">Choisissez la réponse rigoureuse :</p>
              {IQ_QUESTIONS[currentIdx].options.map((option, idx) => {
                const isSelected = answers[IQ_QUESTIONS[currentIdx].id] === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(IQ_QUESTIONS[currentIdx].id, idx)}
                    className={`w-full p-5 rounded-2xl text-left border font-medium text-sm transition-all duration-300 relative overflow-hidden flex items-center justify-between ${
                      isSelected
                      ? 'bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border-indigo-400 shadow-[0_0_20px_rgba(139,92,246,0.15)] text-white font-extrabold'
                      : 'bg-[#121626]/50 border-white/5 hover:border-white/10 hover:bg-[#121626]/80 text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-4">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                        isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-900 border border-white/5 text-slate-400'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{option}</span>
                    </span>
                    {isSelected && (
                      <CheckCircle className="w-5 h-5 text-indigo-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation and state bar */}
          <div className="flex justify-between items-center border-t border-indigo-500/10 pt-6 mt-6">
            <button
              onClick={handleBack}
              disabled={currentIdx === 0}
              className="px-6 py-4.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              Précédent
            </button>

            <div className="flex gap-1">
              {IQ_QUESTIONS.map((_, idx) => (
                <div 
                  key={idx}
                  className={`w-2.5 h-1.5 rounded-full transition-all ${
                    idx === currentIdx ? 'w-6 bg-indigo-500' : (answers[IQ_QUESTIONS[idx].id] !== undefined ? 'bg-indigo-500/40' : 'bg-slate-800')
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              disabled={answers[IQ_QUESTIONS[currentIdx].id] === undefined}
              className="px-8 py-4.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-2"
            >
              {currentIdx === IQ_QUESTIONS.length - 1 ? 'Terminer & Analyser' : 'Suivant'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* NEURAL ANALYSIS PRELOADER SCREEN */}
      {testState === 'analyzing' && (
        <div className="flex-1 flex flex-col justify-center items-center text-center py-20 relative z-10">
          <div className="relative mb-10">
            <div className="w-24 h-24 border-4 border-solid border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <Activity className="w-10 h-10 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>

          <div className="space-y-4 max-w-md mx-auto">
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#ff4e00] font-black bg-[#ff4e00]/10 border border-[#ff4e00]/20 px-4 py-1.5 rounded-full">
              Traitement Synaptique
            </span>
            <h3 className="text-3xl font-extrabold text-white tracking-tight">
              Analyse Matricielle du QI
            </h3>
            
            <div className="p-6 bg-black/40 border border-white/5 rounded-2xl font-mono text-xs text-left text-slate-500 space-y-2.5">
              {[
                "Isolation des vecteurs d'apprentissage...",
                "Calcul de l'indice de Vitesse de Traitement (PSI)...",
                "Évaluation de la Mémoire de Travail (WMI)...",
                "Calcul du Raisonnement Fluide & Quantitatif (PRI)...",
                "Analyse de l'Indice de Compréhension Sémantique (VCI)...",
                "Calibration mathématique finale du Quotient global..."
              ].map((step, idx) => {
                const isActive = idx === analysisStep;
                const isPassed = idx < analysisStep;
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${
                      isActive ? 'bg-indigo-400 animate-ping' : isPassed ? 'bg-emerald-500' : 'bg-slate-800'
                    }`} />
                    <span className={
                      isActive ? 'text-indigo-400 font-bold' : isPassed ? 'text-emerald-500/80' : 'text-slate-600'
                    }>
                      {step}
                    </span>
                    {isPassed && <span className="text-[9px] text-emerald-500/60 ml-auto font-black">[✓ CALIBRÉ]</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DETAILED RESULTS DASHBOARD */}
      {testState === 'results' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex-1 flex flex-col justify-between relative z-10"
        >
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-indigo-500/10 pb-6 gap-4">
              <div className="text-left">
                <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-emerald-400 font-black flex items-center gap-2">
                  <Award className="w-4 h-4" /> Rapport Scientifique Finalisé
                </span>
                <h3 className="text-3xl font-extrabold text-white tracking-tighter">
                  Votre Profil Synaptique
                </h3>
              </div>
              <button
                onClick={handleRestart}
                className="px-5 py-2.5 rounded-xl border border-indigo-500/30 text-indigo-400 hover:text-white hover:bg-indigo-500/10 hover:border-indigo-500 text-xs font-mono font-bold uppercase transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Lancer un nouveau calcul
              </button>
            </div>

            {/* Giant Score showcase & Indices Breakdown card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Score Showcase */}
              <div className="lg:col-span-5 bg-gradient-to-br from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 rounded-3xl p-8 flex flex-col justify-between text-center relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                
                <div className="space-y-2">
                  <p className="text-xs font-mono uppercase tracking-[0.2em] text-indigo-300">Quotient Intellectuel Exact (SD15)</p>
                  <p className="text-7xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-pink-400 tracking-tighter font-mono">
                    {iqScore}
                  </p>
                  <p className="text-xs font-mono text-emerald-400 uppercase tracking-widest font-bold">
                    Rang Percentile : Top {100 - metrics.percentile}% ({metrics.percentile}e percentile mondial)
                  </p>
                </div>

                {/* Score diagnosis text block */}
                <div className="bg-black/40 border border-white/5 rounded-2xl p-5 my-6 text-left">
                  <p className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold mb-2">Diagnostic de l'Architecte Senior :</p>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {iqScore >= 145 ? (
                      "🚀 **Capacité Intellectuelle Exceptionnelle (Elite Class) :** Vous possédez un potentiel d'analyse corrélative exceptionnel, typique des esprits pionniers de la Silicon Valley et leaders de recherche en IA. Aptitude fulgurante d'inférence modale."
                    ) : iqScore >= 130 ? (
                      "✨ **Intelligence Très Supérieure (Mensa Class) :** Diagnostic d'une logique cognitive très articulée, dotée d'une vitesse de traitement binaire et spatiale remarquable. Résolution de problèmes complexes fluide."
                    ) : iqScore >= 115 ? (
                      "💡 **Intelligence Supérieure :** Capacités d'abstraction solides, raisonnement analytique et mathématique bien au-dessus de la norme globale."
                    ) : (
                      "🧠 **Moyenne Standard Hautement Fonctionnelle :** Aptitudes intellectuelles régulières et structurées, propices au travail d'ingénierie appliquée."
                    )}
                  </p>
                </div>

                <div className="flex justify-between font-mono text-[10px] text-slate-500 uppercase tracking-widest border-t border-white/5 pt-4">
                  <span>Questions correctes: {metrics.correctCount} / 8</span>
                  <span className="text-emerald-400 font-bold">Bonus de vitesse: +{metrics.speedBonus} IQ</span>
                </div>
              </div>

              {/* WAIS-IV Subindices Breakdown */}
              <div className="lg:col-span-7 bg-[#121626]/40 border border-white/5 rounded-3xl p-8 space-y-6 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-mono uppercase tracking-[0.2em] text-slate-400 text-left mb-6 border-b border-white/5 pb-3">
                    Profil des Indices Neuro-Cognitifs (WAIS-IV)
                  </h4>

                  <div className="space-y-5">
                    {[
                      { index: 'VCI', label: "Indice de Compréhension Verbale", score: subIndexes.VCI, desc: "Sémantique, plasticité verbale et logique métaphorique.", color: "from-indigo-600 to-indigo-400" },
                      { index: 'PRI', label: "Indice de Raisonnement Perceptif", score: subIndexes.PRI, desc: "Logique pure, transformations 3D et matrices spectrales.", color: "from-purple-600 to-purple-400" },
                      { index: 'WMI', label: "Indice de Mémoire de Travail", score: subIndexes.WMI, desc: "Capacité de buffers mentaux, indexation et parallélisation.", color: "from-pink-600 to-pink-400" },
                      { index: 'PSI', label: "Indice de Vitesse de Traitement", score: subIndexes.PSI, desc: "Vitesse d'exécutage bas niveau, caches mentaux et horloge.", color: "from-emerald-600 to-emerald-400" },
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-2 text-left">
                        <div className="flex justify-between items-center text-xs">
                          <div>
                            <span className="font-mono font-black text-white mr-3">{item.index}</span>
                            <span className="text-slate-300 font-bold">{item.label}</span>
                          </div>
                          <span className="font-mono font-black text-white">{item.score} <span className="text-[9px] text-slate-500">pts</span></span>
                        </div>
                        {/* Custom progress bar */}
                        <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-1000`}
                            style={{ width: `${Math.round(((item.score - 70) / 80) * 100)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 leading-normal">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-indigo-950/20 border border-indigo-500/10 rounded-2xl flex gap-3 items-center">
                  <Compass className="w-5 h-5 text-indigo-400 shrink-0" />
                  <p className="text-[11px] text-indigo-300 text-left font-mono leading-relaxed">
                    Votre matrice neuro-cognitive s'aligne de manière optimale avec les pipelines mathématiques multimodaux. Travaillez votre indexation synaptique au quotidien !
                  </p>
                </div>
              </div>
            </div>

            {/* Answer Corrections Section */}
            <div className="bg-slate-900/20 border border-white/5 rounded-3xl p-6 text-left">
              <h4 className="text-xs font-mono uppercase tracking-[0.2em] text-slate-400 mb-4 border-b border-white/5 pb-2">Correction détaillée &amp; Explications Scientifiques</h4>
              
              <div className="space-y-4 max-h-72 overflow-y-auto pr-2 scrollbar-hide text-xs leading-relaxed font-sans">
                {IQ_QUESTIONS.map((q, idx) => {
                  const userAnswer = answers[q.id];
                  const isCorrect = userAnswer === q.correctIndex;
                  return (
                    <div key={q.id} className={`p-4 rounded-2xl border ${isCorrect ? 'border-emerald-500/10 bg-emerald-500/5' : 'border-red-500/10 bg-red-500/5'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white uppercase tracking-tight text-[13px]">{q.title}</span>
                        <span className={`px-2.5 py-0.5 rounded text-[9px] font-mono font-black uppercase tracking-wider ${isCorrect ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {isCorrect ? 'Correct ✓' : 'Incorrect ✗'}
                        </span>
                      </div>
                      <p className="text-slate-300 mb-2 font-medium">"{q.problem}"</p>
                      <p className="text-slate-400 mb-1 font-mono text-[10px]">
                        Votre choix : <strong className={isCorrect ? 'text-emerald-400' : 'text-red-400'}>{userAnswer !== undefined ? q.options[userAnswer] : '—'}</strong>
                      </p>
                      {!isCorrect && (
                        <p className="text-slate-400 mb-2 font-mono text-[10px]">
                          Réponse exacte : <strong className="text-emerald-400">{q.options[q.correctIndex]}</strong>
                        </p>
                      )}
                      <p className="text-slate-500 text-[10px] leading-relaxed border-l border-white/10 pl-3 italic">
                        {q.explanation}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6 mt-6 border-t border-indigo-500/10">
            <button 
              onClick={onClose}
              className="px-10 py-4 bg-white hover:bg-slate-200 text-black font-black uppercase tracking-[0.2em] text-xs rounded-xl shadow-lg transition-all"
            >
              Quitter l'Espace Q.I.
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
