import express from "express";
import { GoogleGenAI } from "@google/genai"; // Mantido como tinhas

const app = express();
app.use(express.json({ limit: "20mb" })); // Aumentado para fotos de melhor qualidade

// Inicializa a API com a tua chave
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const modelName = "gemini-1.5-flash"; // Estavas a usar 2.5, mas o atual estável é 1.5. Ajusta se necessário.

// --- CONFIGURAÇÃO DAS PRAIAS ---
const PRAIAS_COORDS = {
    "Praia de Matosinhos": { lat: 41.1957, lon: -8.7091 },
    "Praia da Rocha": { lat: 37.1177, lon: -8.5364 },
    "Praia do Guincho": { lat: 38.7327, lon: -9.4725 },
    "Costa da Caparica": { lat: 38.6421, lon: -9.2315 },
    "Praia de Carcavelos": { lat: 38.6797, lon: -9.3346 }
};

// --- FUNÇÃO DE DISTÂNCIA ---
function getDistanciaKM(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}

app.post("/verificar-lixo", async (req, res) => {
  try {
    const { imagemBase64, praia, usuario, lat, lon } = req.body;

    // 1. Validar Localização antes de chamar a IA
    if (praia !== "Outra" && PRAIAS_COORDS[praia]) {
        const km = getDistanciaKM(lat, lon, PRAIAS_COORDS[praia].lat, PRAIAS_COORDS[praia].lon);
        if (km > 3.0) { // 3km de margem
            return res.json({ 
                aprovado: false, 
                motivo: `Estás demasiado longe da praia (${km.toFixed(1)}km).` 
            });
        }
    }

    // 2. Prompt com foco no Nome e Lixo
    const prompt = `
Analisa esta foto na ${praia}.
Responde APENAS com JSON válido.

Regras:
1. Tem de haver lixo visível.
2. Tem de haver um papel ou identificação escrita com o nome: "${usuario}".

Formato:
{
  "aprovado": true ou false,
  "motivo": "texto muito curto"
}
`;

    const result = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: imagemBase64,
                mimeType: "image/jpeg",
              },
            },
          ],
        },
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
    res.status(500).json({
      aprovado: false,
      motivo: "Erro: " + e.message,
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor Online na porta ${PORT}`);
});
