import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json({ limit: "10mb" }));

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

// Mantida a tua versão conforme solicitado
const modelName = "gemini-2.5-flash"; 

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

        console.log(`Recebido pedido de: ${usuario} na praia: ${praia}`);

        if (praia !== "Outra" && PRAIAS_COORDS[praia]) {
            const km = getDistanciaKM(lat, lon, PRAIAS_COORDS[praia].lat, PRAIAS_COORDS[praia].lon);
            if (km > 3.0) {
                console.log(`Fora de alcance: ${km.toFixed(2)}km`);
                return res.json({ 
                    aprovado: false, 
                    motivo: `Distância: ${km.toFixed(1)}km. Deves estar na praia!` 
                });
            }
        }

        const prompt = `
            Analisa esta foto da praia ${praia}.
            Responde APENAS com JSON válido, sem texto extra.

            REGRAS OBRIGATÓRIAS:
            1. Tem de haver lixo visível.
            2. Tem de haver um papel ou inscrição com o nome exato: "${usuario}".

            Formato obrigatório:
            {
              "aprovado": true ou false,
              "motivo": "texto muito curto"
            }
        `;

        const model = ai.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: imagemBase64,
                    mimeType: "image/jpeg",
                },
            },
        ]);

        // --- AQUI ESTÁ A MÁGICA PARA VER OS LOGS ---
        const response = await result.response;
        const text = response.text();
        
        console.log("------------------------------------");
        console.log("RESPOSTA DA IA:");
        console.log(text); // Aqui vês no Render o que ela disse
        console.log("------------------------------------");

        // Limpeza de segurança para garantir que pegamos apenas o JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            const jsonFinal = JSON.parse(jsonMatch[0]);
            res.json(jsonFinal);
        } else {
            throw new Error("Resposta da IA não contém JSON válido");
        }

    } catch (e) {
        console.error("ERRO NO BACKEND:", e.message);
        res.status(500).json({
            aprovado: false,
            motivo: "Erro técnico: " + e.message,
        });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor Online na porta ${PORT}`);
});
