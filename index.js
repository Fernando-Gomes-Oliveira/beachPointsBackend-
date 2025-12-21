const express = require('express');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(express.json({ limit: '10mb' }));

// Inicializar cliente Gemini
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

app.post('/verificar-lixo', async (req, res) => {
  try {
    const { imagemBase64, praia } = req.body;

    const prompt = `Analisa esta foto da ${praia}.
Regras:
1. Deve haver lixo
2. Sem rostos humanos
3. Foto nítida

Responde APENAS JSON:
{"aprovado": true, "motivo": "bom trabalho"}
ou
{"aprovado": false, "motivo": "razão"}`;

    const result = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: imagemBase64
              }
            }
          ]
        }
      ]
    });

    const responseText = result.text
      .replace(/```json|```/g, "")
      .trim();

    res.json(JSON.parse(responseText));

  } catch (e) {
    console.error("ERRO NO SERVIDOR:", e);
    res.status(500).json({
      aprovado: false,
      motivo: "Erro: " + e.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor Online na porta ${PORT}`);
});
