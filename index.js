import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
app.use(express.json({ limit: "10mb" }));

/* =========================
   CONFIG GEMINI
========================= */
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Modelo atual e rápido (mantido como pediste)
const MODEL_NAME = "gemini-2.5-flash";

/* =========================
   PRAIAS
========================= */
const PRAIAS_COORDS = {
  "Praia de Matosinhos": { lat: 41.19573809, lon: -8.70907909 },
  "Praia da Rocha": { lat: 37.11773, lon: -8.53642 },
  "Praia do Guincho": { lat: 38.73273264, lon: -9.47252022 },
  "Costa da Caparica": { lat: 38.6421, lon: -9.2315 },
};

/* =========================
   FUNÇÃO DISTÂNCIA (Haversine)
========================= */
function getDistanciaKM(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/* =========================
   ENDPOINT PRINCIPAL
========================= */
app.post("/verificar-lixo", async (req, res) => {
  try {
    const { imagemBase64, praia, usuario, lat, lon } = req.body;

    if (!imagemBase64 || !usuario) {
      return res.status(400).json({
        aprovado: false,
        motivo: "Dados em falta",
      });
    }

    console.log(`📩 Pedido de ${usuario} | Praia: ${praia}`);

    /* =========================
       VERIFICA LOCALIZAÇÃO
    ========================= */
    if (praia !== "Outra" && PRAIAS_COORDS[praia]) {
      const km = getDistanciaKM(
        lat,
        lon,
        PRAIAS_COORDS[praia].lat,
        PRAIAS_COORDS[praia].lon
      );

      if (km > 3) {
        console.log(`❌ Fora de alcance: ${km.toFixed(2)}km`);
        return res.json({
          aprovado: false,
          motivo: `Distância: ${km.toFixed(1)}km. Deves estar na praia.`,
        });
      }
    }

    /* =========================
       PROMPT GEMINI
    ========================= */
    const prompt = `
Analisa esta imagem tirada na praia "${praia}".

Responde APENAS com JSON válido, sem texto extra.

Regras:
- Verifica se existe lixo visível
- Verifica se há um saco de lixo
- Confirma se existe um papel com o nome EXATO "${usuario}"

Formato obrigatório:
{
  "Aprovado": true ou false,
  "lixo_visivel": true ou false,
  "nome_na_saca_do_lixo": true ou false
}
`;

    const model = ai.getGenerativeModel({ model: MODEL_NAME });

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imagemBase64,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const response = result.response;
    const text = response.text();

    console.log("🤖 RESPOSTA GEMINI:");
    console.log(text);

    /* =========================
       EXTRAÇÃO SEGURA DO JSON
    ========================= */
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("A IA não devolveu JSON válido");
    }

    const jsonFinal = JSON.parse(jsonMatch[0]);

    res.json(jsonFinal);
  } catch (err) {
    console.error("🔥 ERRO:", err.message);
    res.status(500).json({
      aprovado: false,
      motivo: "Erro técnico: " + err.message,
    });
  }
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor online na porta ${PORT}`);
});
