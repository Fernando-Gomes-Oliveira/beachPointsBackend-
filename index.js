import express from "express";
import { GoogleGenAI } from "@google/genai"; // Mantido como tinhas

const app = express();
app.use(express.json({ limit: "20mb" })); // Aumentado para fotos de melhor qualidade
app.use(express.json({ limit: "10mb" }));

// Inicializa a API com a tua chave
// Inicializa a API com a chave do Render
const ai = new GoogleGenAI({
apiKey: process.env.GEMINI_API_KEY,
});

const modelName = "gemini-1.5-flash"; // Estavas a usar 2.5, mas o atual estável é 1.5. Ajusta se necessário.
const modelName = "gemini-2.5-flash";

// --- CONFIGURAÇÃO DAS PRAIAS ---
// --- BASE DE DADOS DE LOCALIZAÇÃO ---
const PRAIAS_COORDS = {
    "Praia de Matosinhos": { lat: 41.1957, lon: -8.7091 },
    "Praia da Rocha": { lat: 37.1177, lon: -8.5364 },
    "Praia do Guincho": { lat: 38.7327, lon: -9.4725 },
    "Costa da Caparica": { lat: 38.6421, lon: -9.2315 },
    "Praia de Carcavelos": { lat: 38.6797, lon: -9.3346 }
    "Praia de Matosinhos": { lat: 41.19573809, lon: -8.70907909 },
    "Praia da Rocha": { lat: 37.11773, lon: -8.53642 },
    "Praia do Guincho": { lat: 38.73273264, lon: -9.47252022 },
    "Costa da Caparica": { lat: 38.6421, lon: -9.2315 } 
};

// --- FUNÇÃO DE DISTÂNCIA ---
@@ -33,29 +32,30 @@ function getDistanciaKM(lat1, lon1, lat2, lon2) {

app.post("/verificar-lixo", async (req, res) => {
try {
    // Adicionamos usuario, lat e lon aos dados recebidos
const { imagemBase64, praia, usuario, lat, lon } = req.body;

    // 1. Validar Localização antes de chamar a IA
    // 1. Validar Localização (Raio de 3km)
if (praia !== "Outra" && PRAIAS_COORDS[praia]) {
const km = getDistanciaKM(lat, lon, PRAIAS_COORDS[praia].lat, PRAIAS_COORDS[praia].lon);
        if (km > 3.0) { // 3km de margem
        if (km > 3.0) {
return res.json({ 
aprovado: false, 
                motivo: `Estás demasiado longe da praia (${km.toFixed(1)}km).` 
                motivo: `Distância: ${km.toFixed(1)}km. Deves estar na praia!` 
});
}
}

    // 2. Prompt com foco no Nome e Lixo
    // 2. Teu Prompt atualizado com o nome do user
const prompt = `
Analisa esta foto na ${praia}.
Responde APENAS com JSON válido.
Analisa esta foto da praia ${praia}.
Responde APENAS com JSON válido, sem texto extra.

Regras:
REGRAS OBRIGATÓRIAS:
1. Tem de haver lixo visível.
2. Tem de haver um papel ou identificação escrita com o nome: "${usuario}".
2. Tem de haver um papel ou inscrição com o nome exato: "${usuario}".

Formato:
Formato obrigatório:
{
 "aprovado": true ou false,
 "motivo": "texto muito curto"
@@ -80,19 +80,19 @@ Formato:
],
});

    // --- TUA LÓGICA DE LIMPEZA DE JSON ---
const text = result.text.replace(/```json|```/g, "").trim();

const jsonStart = text.indexOf("{");
const jsonEnd = text.lastIndexOf("}");
const jsonLimpo = text.slice(jsonStart, jsonEnd + 1);

res.json(JSON.parse(jsonLimpo));

} catch (e) {
    console.error("ERRO:", e.message);
    console.error("ERRO NO MOMENTO DO ENVIO:", e.message);
res.status(500).json({
aprovado: false,
      motivo: "Erro: " + e.message,
      motivo: "Erro na IA: " + e.message,
});
}
});
