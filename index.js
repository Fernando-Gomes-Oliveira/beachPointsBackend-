const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json({ limit: '10mb' }));

// Inicializar com a biblioteca estável
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/verificar-lixo', async (req, res) => {
  try {
    const { imagemBase64, praia } = req.body;
    
    // Usar o modelo flash de forma direta
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Analisa esta foto da ${praia}.
Regras:
1. Deve haver lixo.
2. Sem rostos humanos.
3. Foto nítida.

Responde APENAS JSON:
{"aprovado": true, "motivo": "bom trabalho"} ou {"aprovado": false, "motivo": "razão"}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imagemBase64
        }
      }
    ]);

    const response = await result.response;
    let text = response.text();
    
    // Limpeza rigorosa do JSON para evitar erros
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    res.json(JSON.parse(text));

  } catch (e) {
    console.error("ERRO NO SERVIDOR:", e);
    res.status(500).json({
      aprovado: false,
      motivo: "Erro: " + e.message
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor Online na porta ${PORT}`);
});
