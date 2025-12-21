import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json({ limit: "10mb" }));

// Inicializa a API com a chave do Render
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const modelName = "gemini-2.5-flash";

app.post("/verificar-lixo", async (req, res) => {
  try {
    const { imagemBase64, praia } = req.body;

    const prompt = `
Analisa esta foto da praia ${praia}.
Responde APENAS com JSON válido, sem texto extra.

Formato obrigatório:
{
  "aprovado": true ou false,
  "motivo": "texto curto"
}
`;

    const result = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: imagemBase64,
                mimeType: "image/jpeg",
              },
            },
          ],
        },
      ],
    });

    const text = result.text.replace(/```json|```/g, "").trim();

    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    const jsonLimpo = text.slice(jsonStart, jsonEnd + 1);

    res.json(JSON.parse(jsonLimpo));

  } catch (e) {
    console.error("ERRO NO MOMENTO DO ENVIO:", e.message);
    res.status(500).json({
      aprovado: false,
      motivo: "Erro na IA: " + e.message,
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor Online na porta ${PORT}`);
});
