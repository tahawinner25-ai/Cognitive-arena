// API calls relayed to backend

export async function generateSummary(text: string, language: string): Promise<string> {
  if (!text) return "";
  
  const targetLanguage = language.toLowerCase();
  const summaryInstruction = targetLanguage === 'english' 
    ? "You are an expert cognitive science professor. Provide a very clear, structured summary with bullet points for a student. Use emojis. THE RESPONSE MUST BE EXCLUSIVELY IN ENGLISH."
    : `Tu es un professeur expert en sciences cognitives. Fais un résumé très clair, structuré avec des bullet points pour un étudiant. Utilise des emojis. LA RÉPONSE DOIT ÊTRE EXCLUSIVEMENT EN ${language.toUpperCase()}.`;

  const prompt = `${summaryInstruction}\n\nTexte / Text:\n${text}`;

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (!response.ok) throw new Error('API Error');
    const data = await response.json();
    return data.text || 'Erreur lors de la génération.';
  } catch (err) {
    console.error("Gemini API Error (Summary):", err);
    return "Désolé, l'IA a rencontré une erreur pendant la génération du résumé. Vérifie la console ou tes clés API.";
  }
}

export async function extractVocabulary(text: string, language: string): Promise<string> {
  if (!text) return "[]";
  
  const targetLanguage = language.toLowerCase();
  const summaryInstruction = targetLanguage === 'english' 
    ? "You are an expert linguistics professor. Extract the most complex or difficult words from the following text (max 10 words). Return a JSON array of objects with 'word' and 'definition'. Example: [{\"word\": \"complex\", \"definition\": \"composed of many interconnected parts\"}]"
    : `Tu es un professeur expert en linguistique. Extraire les mots les plus complexes ou difficiles du texte suivant (10 mots max). Renvoie un tableau JSON d'objets avec 'word' et 'definition'. Exemple: [{"word": "complexe", "definition": "composé de plusieurs parties connectées"}]. LA RÉPONSE DOIT ÊTRE EXCLUSIVEMENT EN ${language.toUpperCase()}.`;

  const prompt = `${summaryInstruction}\n\nTexte / Text:\n${text}`;

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (!response.ok) throw new Error('API Error');
    const data = await response.json();
    return data.text || '[]';
  } catch (err) {
    console.error("Gemini API Error (Vocabulary):", err);
    return "[]";
  }
}

export async function queryElasticRAG(query: string, language: string, backendUrl: string): Promise<string> {

  if (!query) return "";

  const targetLanguage = language.toLowerCase();
  
  // 1. TENTATIVE VERS L'API PYTHON EN LOCAL (Le PC de l'utilisateur)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // Timeout allongé (15s) pour Tunnel Pinggy + ML Pipeline
    
    // Appel à FastAPI uvicorn (Mount AI Scholar Backend) via Tunnel Pinggy
    const res = await fetch(`${backendUrl}/api/rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: query, lang: language }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const answer = data.answer || data.result || data.message || "Analyse terminée.";
      const sources = data.sources && Array.isArray(data.sources) ? `\n\n**Sources:** ${data.sources.join(', ')}` : '';
      return `### 📡 Knowledge Engine (HuggingFace Space)\n\n${answer}${sources}`;
    }
  } catch (backendErr) {
    console.log("Python Backend offline. Falling back to Cloud Synthesis.");
  }

  // 2. FALLBACK DE PRODUCTION (Cloud Synthesis Engine)
  const systemContext = targetLanguage === 'english'
    ? "You are the Mount AI Scholar Knowledge Engine. Provide a highly accurate, professional response using your cross-domain knowledge. Use bullet points and emojis. DO NOT mention you are an AI or simulation. RESPONSE MUST BE IN ENGLISH."
    : `Tu es le moteur de connaissances Mount AI Scholar (Cloud Edition). Fournis une réponse structurée, précise et pédagogique. Utilise des bullet points et des emojis. Ne mentionne PAS que tu es une simulation. RÉPONSE DOIT ÊTRE EN ${language.toUpperCase()}.`;

  const prompt = `${systemContext}\n\nRequête / Query: ${query}`;

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (!response.ok) throw new Error('API Error');
    const data = await response.json();
    return data.text || 'Erreur de synthèse de données.';
  } catch (err) {
    console.error("Gemini API Error (Knowledge Base):", err);
    return "Système de connaissance momentanément indisponible. Vérifiez votre connexion réseau.";
  }
}

export async function generateQuiz(text: string, language: string): Promise<string> {
  if (!text) return "";
  
  const targetLanguage = language.toLowerCase();
  const quizInstruction = targetLanguage === 'english'
    ? "Generate a fun 3-question MCQ quiz based on the following text. For each question, provide 3 options (A, B, C) and indicate the correct answer at the end with a brief explanation. THE QUIZ MUST BE EXCLUSIVELY IN ENGLISH."
    : `Génère un quiz de 3 questions à choix multiples (QCM) ludique basé sur le texte suivant. Pour chaque question, propose 3 options (A, B, C) et indique la bonne réponse à la fin avec une petite explication. LE QUIZ DOIT ÊTRE EXCLUSIVEMENT EN ${language.toUpperCase()}.\n\nTexte:`;

  const prompt = `${quizInstruction}\n\n${text}`;

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (!response.ok) throw new Error('API Error');
    const data = await response.json();
    return data.text || 'Erreur lors de la génération du quiz.';
  } catch (err) {
    console.error("Gemini API Error (Quiz):", err);
    return "Erreur lors de la création du quiz.";
  }
}

export async function generateMindMap(text: string, language: string): Promise<string> {
  if (!text) return "";
  
  const targetLanguage = language.toLowerCase();
  const mindMapInstruction = targetLanguage === 'english'
    ? "Create a Mermaid.js diagram (graph TD) to summarize the text. Return ONLY the raw Mermaid code. Use double quotes for ALL labels: A[\"Node\"] -->|\"Link\"| B[\"Node\"]. No text before or after. All text in ENGLISH."
    : `Crée un diagramme (graph TD) en syntaxe Mermaid.js pour résumer le texte suivant. Ne renvoie QUE le code Mermaid brut. IMPORTANT: Utilise SYSTEMATIQUEMENT des doubles guillemets pour TOUS les textes (nœuds ET liens) : A["Texte"] -->|"Lien"| B["Texte"]. N'ajoute JAMAIS de ">" après le lien (ex: incorrect: -->|Lien|>). La langue doit être : ${language.toUpperCase()}.`;

  const prompt = `${mindMapInstruction}\n\nTexte / Text:\n${text}`;

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (!response.ok) throw new Error('API Error');
    const data = await response.json();
    
    let code = data.text || '';
    
    // Essayer d'extraire depuis un bloc de code markdown
    const mdMatch = code.match(/\`\`\`(?:mermaid)?\n?([\s\S]*?)\`\`\`/);
    if (mdMatch) {
      code = mdMatch[1];
    } else {
      // Si pas de bloc, on essaie de trouver le début typique (graph, flowchart, mindmap, stateDiagram, pie, etc.)
      const mermaidStartIndex = code.search(/^(graph|flowchart|mindmap|stateDiagram|pie|sequenceDiagram|classDiagram|erDiagram|journey|gantt)/m);
      if (mermaidStartIndex !== -1) {
        code = code.substring(mermaidStartIndex);
      }
    }
    
    code = code.replace(/\`\`\`mermaid\n?/g, '').replace(/\`\`\`\n?/g, '').trim();
    
    return code || 'graph TD\n  A[Erreur de Génération]';
  } catch (err) {
    console.error("Gemini API Error (MindMap):", err);
    return "graph TD\n  A[Erreur de Connexion à l'IA]";
  }
}
