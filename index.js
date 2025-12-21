const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json({ limit: '10mb' }));

// A solução está aqui: inicializar o cliente sem versão fixa 
// ou garantir que o modelo chama a v1beta
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/verificar-lixo', async (req, res) => {
    try {
        const { imagemBase64, praia } = req.body;
        
        // FORÇAR O USO DA V1BETA NA CHAMADA DO MODELO
        const model = genAI.getGenerativeModel(
            { modelName = "gemini-2.5-pro" }, 
            { apiVersion: 'v1beta' } // <--- ESTA É A LINHA MÁGICA
        );

        const prompt = `Analisa a foto da ${praia}. Responde APENAS JSON: {"aprovado": true, "motivo": "bom"} ou {"aprovado": false, "motivo": "mau"}`;

        const result = await model.generateContent([
            { text: prompt },
            { inlineData: { data: imagemBase64, mimeType: "image/jpeg" } }
        ]);

        const response = await result.response;
        const text = response.text().replace(/```json|```/g, "").trim();
        res.json(JSON.parse(text));

    } catch (e) {
        console.error("ERRO NO MOMENTO DO ENVIO:", e.message);
        res.status(500).json({ aprovado: false, motivo: "Erro na IA: " + e.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor Online (v1beta) na porta ${PORT}`);
});
