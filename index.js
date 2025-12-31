import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json({ limit: "10mb" }));

// Inicializa a API com a chave do Render
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const modelName = "gemini-2.5-flash";

// --- BASE DE DADOS DE LOCALIZAÇÃO ---
const PRAIAS_COORDS = {
    "Praia Norte": { lat: 41.6972286129189, lon: -8.850855546566946 },
   
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
    const { imagemBase64, praia, utilizador, lat, lon } = req.body;

    // 1. Validar Localização (Raio de 3km)
    if (praia !== "Outra" && PRAIAS_COORDS[praia]) {
        const km = getDistanciaKM(lat, lon, PRAIAS_COORDS[praia].lat, PRAIAS_COORDS[praia].lon);
        if (km > 3.0) {
            return res.json({ 
                aprovado: false, 
                motivo: `Distância: ${km.toFixed(1)}km. Deves estar na praia!` 
            });
        }
    }

    // 2. Teu Prompt atualizado com o nome do user
    const prompt = `
Analisa esta foto da praia ${praia}. Responde APENAS em formato JSON válido.
Verifica se há lixo visível e se existe um papel/sinal na saca com o nome "${utilizador}".
TENS DE RESPONDER ASSIM
Formato de resposta:
{
  "aprovado": true,
  "lixo_visivel": true,
  "nome_na_saca": true,
  "motivo": "Explicação breve aqui"
}`;

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

    const text = result.text.replace(/```json|```/g, "").trim();

    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    const jsonLimpo = text.slice(jsonStart, jsonEnd + 1);

    res.json(JSON.parse(jsonLimpo));

  } catch (e) {
    console.error("ERRO NO MOMENTO DO ENVIO:", e.message);
    res.status(500).json({
      aprovado: false,
      motivo: "Erro na IA: " + e.message,
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor Online na porta ${PORT}`);
});
