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
    "Praia de Matosinhos": { lat: 41.19573809, lon: -8.70907909 },
    "Praia da Rocha": { lat: 37.11773, lon: -8.53642 },
    "Praia do Guincho": { lat: 38.73273264, lon: -9.47252022 },
    "Costa da Caparica": { lat: 38.6421, lon: -9.2315 } 
};

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

        // 1. Validar Localização Geográfica (Lógica de servidor)
        let localizacaoReal = true;
        if (praia !== "Outra" && PRAIAS_COORDS[praia]) {
            const km = getDistanciaKM(lat, lon, PRAIAS_COORDS[praia].lat, PRAIAS_COORDS[praia].lon);
            if (km > 3.0) {
                localizacaoReal = false;
            }
        }

        // 2. Novo Prompt conforme o teu pedido
        const prompt = `
Analisa esta foto da praia ${praia}, vais apenas responder em formato JSON válido, nada mais. 
Vais analisar se tem lixo vísivel, tem de haver um papel na saca do lixo com o nome exato do "${usuario}".

Vais escrever desta forma APENAS:
{
  "localização_real": ${localizacaoReal},
  "Aprovado": true ou false,
  "lixo_visivel": true ou false,
  "Nome_na_saca_do_lixo": true ou false
}
`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: imagemBase64,
                    mimeType: "image/jpeg"
                }
            }
        ]);

        const response = await result.response;
        let text = response.text();

        // Limpeza de Markdown se a IA incluir
        text = text.replace(/```json|```/g, "").trim();
        
        // Parsing para garantir que enviamos um objeto JSON puro
        const resultadoFinal = JSON.parse(text);

        // Se a localização_real foi falsa no cálculo inicial, forçamos no JSON
        if (!localizacaoReal) {
            resultadoFinal.localização_real = false;
            resultadoFinal.Aprovado = false;
        }

        res.json(resultadoFinal);

    } catch (e) {
        console.error("ERRO:", e.message);
        res.status(500).json({
            Aprovado: false,
            erro: e.message
        });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor Online na porta ${PORT}`);
});


