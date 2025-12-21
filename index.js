const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json({ limit: '10mb' }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/verificar-lixo', async (req, res) => {
    try {
        const { imagemBase64, praia } = req.body;
        
        // Chamada ao modelo específico que pretendes
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const prompt = `Analisa esta foto da praia ${praia}. 
        Regras: 1. Deve haver lixo. 2. Sem rostos humanos. 3. Foto nítida.
        Responde apenas JSON: {"aprovado": true, "motivo": "bom trabalho"} ou {"aprovado": false, "motivo": "razão"}`;

        const result = await model.generateContent([
            { text: prompt },
            { inlineData: { data: imagemBase64, mimeType: "image/jpeg" } }
        ]);

        const response = await result.response;
        let text = response.text().replace(/```json|```/g, "").trim();
        
        res.json(JSON.parse(text));

    } catch (e) {
        console.error("ERRO NO SERVIDOR:", e.message);
        res.status(500).json({ 
            aprovado: false, 
            motivo: "Erro na IA: " + e.message 
        });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor Ativo com gemini-flash-latest na porta ${PORT}`);
});
