import React, { useState, useRef, useEffect } from 'react';
import { Send, RefreshCw, MessageSquare, Shield, HelpCircle, PhoneCall, AlertCircle, Sparkles } from 'lucide-react';
import { Message } from '../types';

interface CustomerPortalProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isTyping: boolean;
  onResetChat: () => void;
  apiError: string | null;
}

const INQUIRY_TEMPLATES = [
  {
    id: 'billing_dispute',
    label: '💳 Erreur de facturation',
    category: 'Billing',
    text: "Bonjour, j'ai remarqué que j'ai été débité deux fois pour mon abonnement le 20 juin. Mon numéro de commande est BH-88741. Je m'appelle Alex Carter et mon e-mail est alex@example.com. Pouvez-vous s'il vous plaît rembourser le prélèvement en double ?"
  },
  {
    id: 'tech_support',
    label: '💻 Problème de connexion WiFi',
    category: 'Technical Support',
    text: "Bonjour le support, je cherche à connecter ma station domotique intelligente à mon WiFi mais l'application affiche continuellement l'Erreur 403. Je m'appelle Jordan Lee (jordan@example.com). C'est assez urgent car mon chauffage en dépend."
  },
  {
    id: 'delivery_delay',
    label: '📦 Colis en retard #4928',
    category: 'Delivery/Order',
    text: "Bonjour, j'ai commandé un colis lundi avec livraison express sous 24h, mais le suivi ACT-99388 indique qu'il est toujours bloqué au centre de tri de Lyon. Pouvez-vous le localiser ? Je suis Sam Brown (sam.b@example.com, tél 06 12 34 56 78)."
  },
  {
    id: 'account_reset',
    label: '🔑 Récupération de compte bloqué',
    category: 'Account Management',
    text: "Bonjour, mon compte d'entreprise est bloqué suite à trois tentatives de mot de passe infructueuses. Je suis Taylor Swift, mon adresse e-mail enregistrée est taylor@corporate.com. Pouvez-vous réinitialiser mon mot de passe ou débloquer le compte ?"
  },
];

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  messages,
  onSendMessage,
  isTyping,
  onResetChat,
  apiError
}) => {
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleTemplateClick = (text: string) => {
    if (isTyping) return;
    onSendMessage(text);
  };

  // Helper to strip the JSON metadata block [TICKET_DATA: ...] from being rendered in the speech bubble
  const cleanMessageContent = (content: string) => {
    const ticketRegex = /\[TICKET_DATA:[\s\S]*?\]/;
    return content.replace(ticketRegex, '').trim();
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-800 rounded-2xl border border-slate-100 shadow-md overflow-hidden" id="customer-portal">
      {/* Portal Header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm text-white tracking-wider border border-indigo-400">
              AC
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full animate-pulse"></span>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h2 className="font-semibold text-sm leading-tight">Actor</h2>
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-1.5 py-0.2 rounded font-mono font-medium">CONSEILLER IA</span>
            </div>
            <p className="text-xs text-slate-400 font-sans">En ligne • Support Actor Hub</p>
          </div>
        </div>

        <button
          onClick={onResetChat}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center space-x-1"
          title="Réinitialiser la conversation"
          id="btn-reset-chat"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Réinitialiser</span>
        </button>
      </div>

      {/* Connection Notice */}
      <div className="bg-amber-50/80 border-b border-amber-100/50 px-6 py-2 flex items-center justify-between text-xs text-amber-800">
        <div className="flex items-center space-x-2">
          <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Terminal client connecté de manière sécurisée au serveur principal d'Actor Hub.</span>
        </div>
        <div className="flex items-center space-x-1 font-mono text-[10px] text-amber-600 shrink-0">
          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>
          <span>SSL_SÉCURISÉ</span>
        </div>
      </div>

      {/* Message History area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 min-h-[350px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-2 shadow-sm">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="font-semibold text-slate-800 text-base">Démarrer une discussion de support</h3>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Découvrez « Actor », le conseiller virtuel intelligent de notre centre d'appels. Saisissez votre demande d'assistance ou sélectionnez un scénario interactif ci-dessous pour lancer la simulation.
            </p>

            {/* Quick Templates container */}
            <div className="w-full max-w-md pt-4 space-y-2">
              <p className="text-left text-[11px] uppercase tracking-wider font-semibold text-slate-400">Scénarios Clients Interactifs</p>
              <div className="grid grid-cols-1 gap-2">
                {INQUIRY_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => handleTemplateClick(tmpl.text)}
                    className="w-full text-left p-3 rounded-xl border border-slate-200/80 bg-white hover:bg-indigo-50/30 hover:border-indigo-200 transition-all cursor-pointer group text-xs shadow-sm"
                  >
                    <div className="flex items-center justify-between font-medium text-slate-700 group-hover:text-indigo-600 mb-1">
                      <span>{tmpl.label}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono font-normal">
                        {tmpl.category === 'Billing' ? 'Facturation' : tmpl.category === 'Technical Support' ? 'Support Technique' : tmpl.category === 'Delivery/Order' ? 'Livraison' : 'Compte'}
                      </span>
                    </div>
                    <p className="text-slate-400 truncate text-[11px] group-hover:text-slate-500">
                      {tmpl.text}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.role === 'system') return null;
            const isUser = msg.role === 'user';
            const cleanContent = cleanMessageContent(msg.content);

            // Check if this message created a ticket (has JSON data)
            const hasTicketData = msg.content.includes('[TICKET_DATA:');

            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'} transition-all`}
              >
                <div className={`flex items-start space-x-2.5 max-w-[85%] ${isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs select-none ${
                    isUser 
                      ? 'bg-slate-200 text-slate-600' 
                      : 'bg-indigo-600 text-white border border-indigo-400'
                  }`}>
                    {isUser ? 'C' : 'A'}
                  </div>

                  {/* Speech bubble */}
                  <div>
                    <div className={`rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                      isUser 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                    }`}>
                      {/* Message Text */}
                      <p className="whitespace-pre-wrap">{cleanContent}</p>

                      {/* Ticket Generated Banner */}
                      {hasTicketData && (
                        <div className="mt-3 pt-2.5 border-t border-emerald-100/30 text-[11px] flex items-center space-x-1.5 text-emerald-600 bg-emerald-50/50 p-2 rounded-lg">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                          <div>
                            <span className="font-semibold block">Action Système : Demande enregistrée</span>
                            <span className="text-slate-400">Actor a créé un ticket d'incident dans la file d'attente CRM.</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block px-1 text-right">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2.5 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 font-bold text-xs select-none">
                A
              </div>
              <div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 text-xs shadow-sm flex items-center space-x-1.5">
                  <span className="text-slate-500 font-mono text-[11px]">Actor écrit</span>
                  <div className="flex space-x-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error message banner */}
        {apiError && (
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Erreur de connexion</p>
              <p className="text-rose-500 mt-0.5">{apiError}</p>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggested chips if some messages already exist */}
      {messages.length > 0 && !isTyping && (
        <div className="px-6 py-2 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider self-center mr-1.5 select-none">Suggestions :</span>
          <button 
            onClick={() => handleTemplateClick("Pouvez-vous résumer ma demande s'il vous plaît ?")}
            className="text-[11px] bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
          >
            📋 Résumer ma demande
          </button>
          <button 
            onClick={() => handleTemplateClick("Je souhaite mettre à jour mon adresse e-mail.")}
            className="text-[11px] bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
          >
            📧 Changer mon e-mail
          </button>
          <button 
            onClick={() => handleTemplateClick("À qui puis-je m'adresser si mon cas est extrêmement urgent ?")}
            className="text-[11px] bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
          >
            ⚠️ Parler à un humain
          </button>
        </div>
      )}

      {/* Message input area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-100 bg-white flex items-center space-x-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isTyping ? "Actor est en train de répondre..." : "Posez une question à Actor, déposez une demande..."}
          disabled={isTyping}
          className="flex-1 px-4 py-2.5 text-xs text-slate-800 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          id="input-customer-message"
        />
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-200 disabled:text-slate-400 transition-colors cursor-pointer shrink-0"
          id="btn-send-message"
          title="Envoyer le message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
