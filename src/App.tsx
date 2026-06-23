import { useState, useEffect } from 'react';
import { CustomerPortal } from './components/CustomerPortal';
import { Message } from './types';
import { Phone, Shield, Sparkles, Settings, Key, HelpCircle, X, Check, AlertCircle } from 'lucide-react';

const GREETING_MESSAGE: Message = {
  id: 'greet',
  role: 'model',
  content: "Bonjour ! Bienvenue au service client d'Actor Hub. Je suis Actor, votre conseiller virtuel intelligent. Comment puis-je vous aider aujourd'hui ? Si vous avez une question sur un produit, une facture, une livraison ou un accès à votre compte, n'hésitez pas à m'en faire part pour que je puisse vous apporter une solution immédiate.",
  timestamp: new Date().toISOString()
};

const CLIENT_SYSTEM_INSTRUCTIONS = `Vous êtes "Actor", un assistant de support client IA hautement qualifié, chaleureux et très professionnel pour "Actor Hub", un centre d'appels de premier ordre.

Votre mission principale est d'aider les clients à résoudre leurs demandes, de recueillir leurs réclamations, de vérifier le statut de leurs commandes ou de planifier des services de manière efficace et avec une grande empathie.

RÈGLES DE LANGUE ET TON :
1. Vous devez vous exprimer UNIQUEMENT en français.
2. Utilisez un ton très poli, chaleureux, professionnel et digne d'un conseiller clientèle d'élite.
3. Utilisez impérativement le VOUVOIEMENT ("vous") pour vous adresser aux clients.
4. Exprimez une empathie sincère en cas d'insatisfaction ou de problème rencontré par le client.
5. Formulez des réponses très courtes, concises, directes et faciles à comprendre (maximum 2 à 3 phrases). Soyez direct et évitez les longs discours ou le jargon technique inutile.

PROTOCOLE DE COLLECTE D'INFORMATIONS :
- Avant de proposer une résolution finale ou d'escalader une demande complexe, demandez poliment et collectez les informations suivantes :
  * Nom complet du client
  * Adresse e-mail
  * Numéro de téléphone (si pertinent)
  * Numéro de commande ou identifiant de compte (si pertinent)
  * Description détaillée du problème ou de la demande

GÉNÉRATION AUTOMATIQUE DE TICKET :
En tant qu'assistant de centre d'appels, vous pouvez enregistrer directement des tickets d'assistance dans le système CRM de Actor Hub.
Dès que vous avez réuni les informations essentielles (au minimum le Nom du client, son adresse e-mail et la description de son problème), résumez brièvement sa demande pour confirmation, puis générez les métadonnées cachées du ticket.
IMPORTANT : À la toute fin de votre réponse, vous devez impérativement ajouter une unique ligne contenant un tag JSON de ticket, exactement sous ce format :
[TICKET_DATA: {"customerName": "...", "customerEmail": "...", "customerPhone": "...", "category": "Billing" | "Technical Support" | "Delivery/Order" | "Account Management" | "General Feedback", "description": "...", "priority": "High" | "Medium" | "Low", "orderId": "..."}]

Règles pour la priorité du ticket (priority) :
- "High" si le client est extrêmement mécontent, subit un blocage majeur de service ou un litige financier important.
- "Medium" pour un problème de facturation standard, un retard de livraison modéré ou un dysfonctionnement technique classique.
- "Low" pour des questions générales, des suggestions ou de simples mises à jour.

// Rappel : Gardez le JSON valide, sur une seule ligne, placé exactement à la toute fin de votre réponse. Restez parfaitement dans votre rôle tout au long de la discussion !`;

function getMockActorResponse(newMessages: Message[]): string {
  const userMessages = newMessages.filter(m => m.role === 'user');
  const lastUserMsg = userMessages[userMessages.length - 1]?.content || "";
  
  let email = "";
  let name = "";
  let phone = "";
  let orderId = "";
  let category = "General Feedback";
  let priority = "Low";
  let description = "Demande de support client";

  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
  const phoneRegex = /(0\d[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}|\+?\d{10,13})/;
  const orderRegex = /\b(BH-\d{4,}|ACT-\d{4,}|ACT-\d+|BH-\d+)\b/i;

  userMessages.forEach(m => {
    const text = m.content;
    const emailMatch = text.match(emailRegex);
    if (emailMatch) email = emailMatch[1];

    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) phone = phoneMatch[1];

    const orderMatch = text.match(orderRegex);
    if (orderMatch) orderId = orderMatch[1].toUpperCase();

    const nameMatch = text.match(/(?:je m'appelle|je suis|mon nom est|nom\s*:\s*)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    if (nameMatch) name = nameMatch[1];
  });

  const fullText = userMessages.map(m => m.content).join(" ").toLowerCase();
  if (fullText.includes("facture") || fullText.includes("débité") || fullText.includes("rembours") || fullText.includes("abonnement") || fullText.includes("paye") || fullText.includes("billing")) {
    category = "Billing";
    priority = "Medium";
    description = "Problème de facturation ou remboursement";
  } else if (fullText.includes("wifi") || fullText.includes("connexion") || fullText.includes("erreur") || fullText.includes("panne") || fullText.includes("403") || fullText.includes("bug") || fullText.includes("technique")) {
    category = "Technical Support";
    priority = "High";
    description = "Problème d'accès WiFi ou erreur d'application";
  } else if (fullText.includes("colis") || fullText.includes("livraison") || fullText.includes("retard") || fullText.includes("suivi") || fullText.includes("transport")) {
    category = "Delivery/Order";
    priority = "Medium";
    description = "Suivi ou retard de livraison de commande";
  } else if (fullText.includes("mot de passe") || fullText.includes("bloqué") || fullText.includes("compte") || fullText.includes("login")) {
    category = "Account Management";
    priority = "Medium";
    description = "Récupération ou déblocage de compte utilisateur";
  }

  if (lastUserMsg.length < 100) {
    description = lastUserMsg;
  }

  const missing = [];
  if (!name) missing.push("votre nom complet");
  if (!email) missing.push("votre adresse e-mail");
  if (category === "Billing" && !orderId) missing.push("votre numéro de commande");
  if (category === "Delivery/Order" && !orderId) missing.push("votre numéro de suivi");

  if (missing.length > 0) {
    if (missing.length === 1) {
      return `Je comprends tout à fait. Pour compléter votre dossier, pourriez-vous m'indiquer ${missing[0]} s'il vous plaît ?`;
    } else if (missing.length === 2) {
      return `Merci pour ces précisions. Afin que je puisse traiter votre demande, j'aurais besoin de ${missing[0]} ainsi que de ${missing[1]}.`;
    } else {
      return `Bonjour. C'est bien noté. Pour que je puisse vous aider efficacement, pourriez-vous me fournir ${missing.slice(0, -1).join(", ")} et ${missing[missing.length - 1]} s'il vous plaît ?`;
    }
  }

  const finalTicket = {
    customerName: name || "Client Anonyme",
    customerEmail: email || "contact@example.com",
    customerPhone: phone || "",
    category,
    description,
    priority,
    orderId: orderId || ""
  };

  return `Parfait, j'ai réuni toutes les informations nécessaires. Je viens de créer un ticket d'assistance prioritaire pour vous. Notre équipe va traiter votre dossier sous les plus brefs délais et vous recontactera à l'adresse ${finalTicket.customerEmail}.\n\n[TICKET_DATA: ${JSON.stringify(finalTicket)}]`;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([GREETING_MESSAGE]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Key management states
  const [auraKey, setAuraKey] = useState<string>(() => localStorage.getItem('local_aura_key') || '');
  const [geminiKey, setGeminiKey] = useState<string>(() => localStorage.getItem('local_gemini_key') || '');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('demo_mode_active');
    // If we have a default/local auraKey or env key and no saved demo mode preference, default to real key instead of demo
    if (!saved && (localStorage.getItem('local_aura_key') || (import.meta as any).env.VITE_AURA_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY)) {
      return false;
    }
    return saved === 'true';
  });
  const [keySettingsOpen, setKeySettingsOpen] = useState<boolean>(false);

  // Handle customer portal messages
  const handleSendMessage = async (content: string) => {
    setApiError(null);
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsTyping(true);

    // If Demo Mode (Simulation) is active, bypass real API calls and run local stateful engine
    if (isDemoMode) {
      setTimeout(() => {
        const reply = getMockActorResponse(newMessages);
        const modelMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'model',
          content: reply,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, modelMsg]);
        setIsTyping(false);
      }, 1200);
      return;
    }

    // Retrieve active client key (local storage overrides env variables)
    const clientApiKey = auraKey || geminiKey || (import.meta as any).env.VITE_AURA_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;

    if (clientApiKey) {
      // Direct client-side Gemini fallback for static hostings like Netlify
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: clientApiKey });
        
        const contents = newMessages.map(msg => ({
          role: msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }));

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: contents,
          config: {
            systemInstruction: CLIENT_SYSTEM_INSTRUCTIONS,
          }
        });

        const reply = response.text || "Je m'excuse, j'ai rencontré un problème pour traiter votre demande. Pourriez-vous répéter s'il vous plaît ?";
        
        const modelMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'model',
          content: reply,
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, modelMsg]);
        setIsTyping(false);
        return;
      } catch (clientErr: any) {
        console.error("Client-side Gemini API failure:", clientErr);
        setApiError(`Échec de l'appel direct Gemini client : ${clientErr.message || clientErr}. Essayez d'activer le Mode Démo.`);
        setIsTyping(false);
        return;
      }
    }

    // Server-side call via Express
    try {
      let response;
      try {
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ history: newMessages }),
        });
      } catch (networkErr: any) {
        throw new Error(`Erreur réseau : Impossible de joindre le serveur d'API d'Actor. (${networkErr.message})`);
      }

      // Detect if static server or Netlify is serving the index.html page as a fallback (typically returns html)
      const contentType = response.headers.get("content-type") || "";
      const isHtml = contentType.includes("text/html");

      if (isHtml || response.status === 404) {
        throw new Error(
          "Erreur d'hébergement : Le serveur d'API (/api/chat) est introuvable (404) ou renvoie une page HTML. " +
          "Sur Netlify, seule la partie statique est hébergée et le serveur Express ne tourne pas. " +
          "Veuillez utiliser l'URL de développement d'AI Studio pour tester pleinement le serveur, " +
          "ou configurez la variable d'environnement Netlify 'VITE_GEMINI_API_KEY' pour exécuter l'IA en direct depuis votre navigateur."
        );
      }

      const responseText = await response.text();

      if (!response.ok) {
        let errMessage = `Erreur serveur (${response.status})`;
        try {
          if (responseText.trim()) {
            const errData = JSON.parse(responseText);
            errMessage = errData.error || errMessage;
          }
        } catch {
          errMessage = responseText.substring(0, 150) || errMessage;
        }
        throw new Error(errMessage);
      }

      let data;
      try {
        if (!responseText.trim()) {
          throw new Error("La réponse du serveur est vide.");
        }
        data = JSON.parse(responseText);
      } catch {
        throw new Error("Échec du décodage de la réponse (format JSON attendu invalide).");
      }

      const reply = data.content;

      const modelMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'model',
        content: reply,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, modelMsg]);

    } catch (err: any) {
      console.error("Chat communication failure:", err);
      setApiError(err.message || "Échec de la communication avec Actor. Veuillez réessayer plus tard.");
    } finally {
      setIsTyping(false);
    }
  };

  const handleResetChat = () => {
    setMessages([GREETING_MESSAGE]);
    setApiError(null);
    setIsTyping(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation / Brand Bar */}
      <header className="bg-slate-950 border-b border-slate-800/80 px-6 py-4 shrink-0 shadow-lg relative z-10">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md border border-indigo-400/20 flex items-center justify-center animate-pulse-subtle">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-black tracking-tight text-white font-sans">Actor Hub</h1>
                <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">CONSEILLER IA</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Terminal de support client d'entreprise alimenté par l'IA d'Actor</p>
            </div>
          </div>

          {/* Key Settings & Support controls */}
          <div className="flex items-center space-x-3 text-xs">
            <button
              onClick={() => setKeySettingsOpen(true)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer font-medium"
              id="btn-trigger-key-settings"
            >
              <span className={`w-2 h-2 rounded-full ${isDemoMode ? 'bg-amber-400 animate-pulse' : (auraKey || geminiKey) ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
              <span>{isDemoMode ? 'Mode Démo (Simulation)' : (auraKey || geminiKey) ? 'Clé personnalisée active' : 'Mode Serveur'}</span>
              <Settings className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace (centered, beautifully layouted single column chat) */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 flex flex-col justify-center overflow-hidden">
        <div className="flex-1 flex flex-col h-[calc(100vh-140px)] min-h-[550px]">
          <div className="mb-2 px-1 flex items-center justify-between shrink-0">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Console de discussion du support client</span>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/40 border border-indigo-900/40 px-2 py-0.5 rounded">NODE_SECURE_01</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <CustomerPortal 
              messages={messages} 
              onSendMessage={handleSendMessage} 
              isTyping={isTyping} 
              onResetChat={handleResetChat}
              apiError={apiError}
              onConfigureKeys={() => setKeySettingsOpen(true)}
              onActivateDemo={() => {
                setIsDemoMode(true);
                localStorage.setItem('demo_mode_active', 'true');
                setApiError(null);
              }}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 py-3 px-6 text-center text-[11px] text-slate-600 border-t border-slate-800/40 shrink-0">
        <p>Portail de service du centre d'appels Actor Hub • Alimenté par l'architecture intelligente Actor • Créé dans un environnement sécurisé</p>
      </footer>

      {/* API Key Settings Modal overlay */}
      {keySettingsOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="key-settings-modal">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Key className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">Configuration de Clé d'API</h3>
              </div>
              <button 
                onClick={() => setKeySettingsOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-850 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-slate-300">
              <p className="text-xs text-slate-400 leading-relaxed">
                Pour faire fonctionner l'assistant Actor sur Netlify ou d'autres hébergements statiques sans passer par notre serveur principal, vous pouvez coller votre propre clé ou générer une simulation de démonstration instantanée.
              </p>

              {/* Demo Mode Button */}
              <div className="p-3 bg-indigo-950/40 border border-indigo-900/50 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-300 flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Mode Démo / Simulation (Gratuit)</span>
                  </span>
                  <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-bold uppercase font-mono">Recommandé</span>
                </div>
                <p className="text-[11px] text-slate-450 leading-relaxed">
                  Simule localement l'IA de manière interactive et fluide. Idéal pour tester sans configurer de clés réelles ni risquer de dépassement de quota !
                </p>
                <button
                  onClick={() => {
                    setIsDemoMode(true);
                    localStorage.setItem('demo_mode_active', 'true');
                    setApiError(null);
                    setKeySettingsOpen(false);
                  }}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    isDemoMode 
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md' 
                      : 'bg-indigo-600 hover:bg-indigo-555 text-white'
                  }`}
                >
                  {isDemoMode ? <Check className="w-3.5 h-3.5" /> : null}
                  <span>{isDemoMode ? "Mode Démo Actif" : "Créer une clé de simulation & l'utiliser"}</span>
                </button>
              </div>

              {/* Manual Input Fields */}
              <div className="space-y-3 pt-2">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Ou coller vos clés réelles</div>
                
                <div className="space-y-1">
                  <label className="block text-[11px] text-slate-300 font-medium">Clé Aura (AURA_KEY)</label>
                  <input 
                    type="password"
                    placeholder="Ex: AIzaSy..."
                    value={auraKey}
                    onChange={(e) => {
                      setAuraKey(e.target.value);
                      localStorage.setItem('local_aura_key', e.target.value);
                      if (e.target.value) {
                        setIsDemoMode(false);
                        localStorage.setItem('demo_mode_active', 'false');
                        setApiError(null);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] text-slate-300 font-medium">Clé Gemini API (GEMINI_API_KEY)</label>
                  <input 
                    type="password"
                    placeholder="Ex: AIzaSy..."
                    value={geminiKey}
                    onChange={(e) => {
                      setGeminiKey(e.target.value);
                      localStorage.setItem('local_gemini_key', e.target.value);
                      if (e.target.value) {
                        setIsDemoMode(false);
                        localStorage.setItem('demo_mode_active', 'false');
                        setApiError(null);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Action Button */}
              <div className="flex space-x-2 pt-2">
                {(auraKey || geminiKey || isDemoMode) && (
                  <button
                    onClick={() => {
                      setAuraKey('');
                      setGeminiKey('');
                      setIsDemoMode(false);
                      localStorage.removeItem('local_aura_key');
                      localStorage.removeItem('local_gemini_key');
                      localStorage.removeItem('demo_mode_active');
                    }}
                    className="flex-1 py-2 px-3 border border-slate-800 hover:bg-slate-850 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  >
                    Réinitialiser tout
                  </button>
                )}
                <button
                  onClick={() => setKeySettingsOpen(false)}
                  className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

