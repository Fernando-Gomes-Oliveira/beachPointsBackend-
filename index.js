const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json({ limit: '10mb' }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/verificar-lixo', async (req, res) => {
    try {
        const { imagemBase64, praia } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Analisa esta foto da ${praia}. 
        Regras: 1. Deve haver lixo. 2. Sem rostos. 3. Foto nítida.
        Responde apenas JSON: {"aprovado": true, "motivo": "bom trabalho"} ou {"aprovado": false, "motivo": "razão"}`;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: imagemBase64, mimeType: "image/jpeg" } }
        ]);

        const responseText = result.response.text().replace(/```json|```/g, "").trim();
        res.json(JSON.parse(responseText));
    } } catch (e) {
    console.error("ERRO DETALHADO:", e); // Aparecerá nos Logs do Render
    res.status(500).json({ aprovado: false, motivo: e.message }); // Aparecerá no teu telemóvel

});

const PORT = process.env.PORT || 3000; 

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor Online na porta ${PORT}`);
});
