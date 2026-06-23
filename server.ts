import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini API client
let aiClient: GoogleGenAI | null = null;

function getAi(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.AURA_KEY || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("AURA_KEY or GEMINI_API_KEY environment variable is missing. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Helper to query Gemini with retry & fallback model logic for 503/transient errors
async function generateContentWithFallback(ai: GoogleGenAI, params: any): Promise<any> {
  const modelsToTry = [
    params.model || "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
  ];
  
  let lastError: any = null;
  
  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[Gemini Request] Trying model ${model}, attempt ${attempt}`);
        const response = await ai.models.generateContent({
          ...params,
          model: model,
        });
        console.log(`[Gemini Request] Success with model ${model} on attempt ${attempt}`);
        return response;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini Request] Attempt ${attempt} with model ${model} failed:`, err.message || err);
        
        // Don't retry if it's an authorization/API key error or invalid request
        if (err.status === 400 || err.status === 401 || err.status === 403 || err.message?.includes("API key")) {
          throw err;
        }
        
        // Wait with exponential backoff
        if (attempt < 3) {
          const delay = attempt * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }
  
  throw lastError || new Error("Failed to generate content after attempting fallback models.");
}

// System instructions for the Customer Call Center Assistant, Actor
const SYSTEM_INSTRUCTIONS = `Vous êtes "Actor", un assistant de support client IA hautement qualifié, chaleureux et très professionnel pour "Actor Hub", un centre d'appels de premier ordre.

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

Rappel : Gardez le JSON valide, sur une seule ligne, placé exactement à la toute fin de votre réponse. Restez parfaitement dans votre rôle tout au long de la discussion !`;

// API routes
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Chat endpoint with Gemini API
app.post("/api/chat", async (req, res) => {
  try {
    const { history } = req.body;

    if (!history || !Array.isArray(history)) {
      return res.status(400).json({ error: "Historique de chat manquant ou invalide." });
    }

    const ai = getAi();

    // Map the client message history to Gemini contents format
    // Roles in gemini: 'user' or 'model'
    const contents = history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTIONS,
        temperature: 0.7,
      },
    });

    const reply = response.text || "Je m'excuse, j'ai rencontré un problème pour traiter votre demande. Pourriez-vous répéter s'il vous plaît ?";
    res.json({ content: reply });
  } catch (error: any) {
    console.error("Gemini API Error in /api/chat:", error);
    res.status(500).json({ 
      error: error.message || "Une erreur inattendue est survenue dans le système d'Actor.",
      details: "Veuillez vérifier que la clé GEMINI_API_KEY est bien configurée."
    });
  }
});

// Simulates generating a call summary and evaluation for stats/audit logs
app.post("/api/audit-call", async (req, res) => {
  try {
    const { chatHistory } = req.body;

    if (!chatHistory || !Array.isArray(chatHistory)) {
      return res.status(400).json({ error: "Missing chat history." });
    }

    const ai = getAi();

    const auditPrompt = `Below is a chat transcript between a customer and the customer support AI "Actor".
Analyze this conversation and generate a structured summary in JSON format.
The JSON must strictly conform to this schema:
{
  "summary": "1-2 sentence summary of what occurred",
  "sentiment": "Positive" | "Neutral" | "Negative",
  "handlingTimeEstimate": number (estimate duration of call in seconds, based on message count, e.g., 30s per message),
  "customerSatisfactionEstimate": number (1 to 5 stars estimate based on customer's ending tone)
}

Transcript:
${chatHistory.map((m: any) => `${m.role === 'user' ? 'Customer' : 'Actor'}: ${m.content}`).join("\n")}

Respond ONLY with valid JSON inside a codeblock or raw. No conversational filler.`;

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: auditPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const resultText = response.text;
    res.json(JSON.parse(resultText || "{}"));
  } catch (error: any) {
    console.error("Audit API Error in /api/audit-call:", error);
    res.status(500).json({ error: error.message || "Failed to audit call." });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Actor Hub Server] Running at http://localhost:${PORT}`);
  });
}

startServer();
