import { useState } from 'react';
import { CustomerPortal } from './components/CustomerPortal';
import { Message } from './types';
import { Phone, Shield, Sparkles } from 'lucide-react';

const GREETING_MESSAGE: Message = {
  id: 'greet',
  role: 'model',
  content: "Bonjour ! Bienvenue au service client d'Actor Hub. Je suis Actor, votre conseiller virtuel intelligent. Comment puis-je vous aider aujourd'hui ? Si vous avez une question sur un produit, une facture, une livraison ou un accès à votre compte, n'hésitez pas à m'en faire part pour que je puisse vous apporter une solution immédiate.",
  timestamp: new Date().toISOString()
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([GREETING_MESSAGE]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: newMessages }),
      });

      if (!response.ok) {
        let errMessage = "Échec de la communication avec le serveur d'Actor.";
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errData = await response.json();
            errMessage = errData.error || errMessage;
          } else {
            if (response.status === 404) {
              errMessage = "Erreur 404 : Le serveur d'API (/api/chat) est introuvable. Netlify n'héberge que la partie statique (client) et n'exécute pas le serveur Express (Node.js) requis pour sécuriser la clé API Gemini. Veuillez tester l'application directement via l'URL de développement d'AI Studio ou déployer l'intégralité du conteneur.";
            } else {
              const text = await response.text();
              errMessage = `Erreur serveur (${response.status}) : ${text.substring(0, 150)}`;
            }
          }
        } catch {
          errMessage = `Erreur de communication (Code ${response.status}).`;
        }
        throw new Error(errMessage);
      }

      let data;
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          throw new Error("Le serveur a renvoyé un format non valide.");
        }
      } catch {
        throw new Error("Échec du décodage de la réponse du serveur.");
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

          {/* Quick Hub Stats */}
          <div className="flex items-center space-x-6 text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Sécurité du canal : <strong className="text-white">Sécurisé de bout en bout</strong></span>
            </div>
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
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 py-3 px-6 text-center text-[11px] text-slate-600 border-t border-slate-800/40 shrink-0">
        <p>Portail de service du centre d'appels Actor Hub • Alimenté par l'architecture intelligente Actor • Créé dans un environnement sécurisé</p>
      </footer>
    </div>
  );
}

