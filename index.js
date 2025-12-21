import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(express.json({ limit: "20mb" }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- BASE DE DADOS DE LOCALIZAÇÃO ---
const PRAIAS_COORDS = {
    "Praia de Matosinhos": { lat: 41.1957, lon: -8.7091 },
    "Praia da Rocha": { lat: 37.1177, lon: -8.5364 },
    "Praia do Guincho": { lat: 38.7327, lon: -9.4725 },
    "Costa da Caparica": { lat: 38.6421, lon: -9.2315 }, // Corrigido
    "Praia de Carcavelos": { lat: 38.6797, lon: -9.3346 }
};

// --- FUNÇÃO DE CÁLCULO DE DISTÂNCIA (Haversine) ---
// Retorna a distância em Quilómetros
function getDistanciaKM(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em KM
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}

app.post("/verificar-lixo", async (req, res) => {
    try {
        const { imagemBase64, praia, usuario, lat, lon } = req.body;

        // 1. VERIFICAÇÃO DE DISTÂNCIA (GPS)
        if (praia !== "Outra" && PRAIAS_COORDS[praia]) {
            const distancia = getDistanciaKM(lat, lon, PRAIAS_COORDS[praia].lat, PRAIAS_COORDS[praia].lon);
            
            // Se estiver a mais de 2.5km do centro da praia, rejeita logo
            if (distancia > 2.5) {
                return res.json({ 
                    aprovado: false, 
                    motivo: `Estás a ${distancia.toFixed(1)}km de distância. Precisas de estar na praia!` 
                });
            }
        }

        // 2. VERIFICAÇÃO PELA IA (Gemini)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Analisa esta foto de limpeza na ${praia}.
            REGRAS PARA APROVAR:
            1. Deve haver lixo visível.
            2. Deve haver um papel ou identificação escrita com o nome exato: "${usuario}".
            
            Responde APENAS em JSON:
            {"aprovado": boolean, "motivo": "frase muito curta"}
            
            Se não vires o nome "${usuario}", reprova com o motivo "Nome ausente ou ilegível".
        `;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: imagemBase64, mimeType: "image/jpeg" } }
        ]);

        const text = result.response.text().replace(/```json|```/g, "").trim();
        const jsonResposta = JSON.parse(text);

        res.json(jsonResposta);

    } catch (e) {
        console.error(e);
        res.status(500).json({ aprovado: false, motivo: "Erro no servidor" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => console.log(`Backend rodando na porta ${PORT}`));
