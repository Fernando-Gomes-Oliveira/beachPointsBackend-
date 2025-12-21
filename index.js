const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json({ limit: '10mb' }));

// Inicializa a API com a versão v1 (estável)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/verificar-lixo', async (req, res) => {
    try {
        const { imagemBase64, praia } = req.body;
        
        // Usar o alias 'latest' resolve o erro 404 em muitos casos
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash-latest"
        });

        const prompt = `Analisa esta foto da praia ${praia}. 
        Responde apenas JSON: {"aprovado": true, "motivo": "bom trabalho"} ou {"aprovado": false, "motivo": "razão"}`;

        const result = await model.generateContent([
            { text: prompt },
            { inlineData: { data: imagemBase64, mimeType: "image/jpeg" } }
        ]);

        const response = await result.response;
        const text = response.text().replace(/```json|```/g, "").trim();
        
        res.json(JSON.parse(text));

    } catch (e) {
        console.error("ERRO NO MOMENTO DO ENVIO:", e.message);
        res.status(500).json({ 
            aprovado: false, 
            motivo: "Erro na IA: " + e.message 
        });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor Online na porta ${PORT}`);
});
