const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json({ limit: '10mb' }));

// TESTE DE CHAVE: Isto vai aparecer nos logs do Render quando o servidor arrancar
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.log("❌ ERRO: A variável GEMINI_API_KEY está VAZIA no Render!");
} else {
    console.log("✅ SUCESSO: A chave foi carregada (começa por: " + apiKey.substring(0, 4) + "...)");
}

const genAI = new GoogleGenerativeAI(apiKey);

app.post('/verificar-lixo', async (req, res) => {
    try {
        const { imagemBase64, praia } = req.body;
        
        // Usar gemini-1.5-flash (sem o -latest para testar estabilidade)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
        console.error("ERRO DETALHADO:", e.message);
        res.status(500).json({ aprovado: false, motivo: "Erro: " + e.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor Online na porta ${PORT}`);
});
