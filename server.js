// server.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "20mb" }));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/analyze", async (req, res) => {
  try {
    const { imageDataUrl, pair, timeframe } = req.body || {};
    if (!imageDataUrl) return res.status(400).json({ ok: false, error: "missing imageDataUrl" });

    const prompt = `
Sos un analista técnico. Analizá ESTA IMAGEN de un gráfico de Pocket Option.
Reglas de Ariel (estrictas):
- Medias: TMA(2) BLANCA, TMA(6) AZUL, EMA(10) AMARILLA, EMA(50) ROJA (EMA), SMA(100) ROJA (SMA).
- Señal CALL válida: TMA2 cruza arriba TMA6 y ambas quedan sobre EMA10; mejor si precio/medias cortas están sobre EMA50/SMA100.
- Señal PUT válida: TMA2 cruza abajo TMA6 y ambas quedan bajo EMA10; mejor si precio/medias cortas están bajo EMA50/SMA100.
- Confirmaciones:
  * MACD: cruce real de línea rápida sobre lenta (CALL) o debajo (PUT) + histograma con volumen.
  * Estocástico (14,3,3): cruce en la dirección de la entrada (ideal saliendo de 20/80).
  * ADX: valor suficiente y reacción (+DI/-DI en dirección).
- Vela de señal: ideal “engulfing” o continuación con mecha opuesta no dominante.
- Output BREVE, estructurado, en JSON, sin texto extra:
{
  "entry": "CALL" | "PUT" | "ESPERAR",
  "prob": 55..95,        // entero
  "duracion": 2 | 3,     // minutos sugeridos
  "motivo": "frase natural y concreta basada en lo que ves",
  "bullets": ["punto1","punto2"] // 3-6 bullets cortos
}
    `;

    const resp = await client.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_text", text: `Par: ${pair || "?"} | Timeframe: ${timeframe || "M1"}` },
            { type: "input_image", image_url: imageDataUrl }
          ]
        }
      ],
      max_output_tokens: 400
    });

    // Extraer texto
    const text = resp.output_text?.trim() || "";
    // Intentar parsear JSON
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Fallback mínimo si no vino JSON limpio
      parsed = {
        entry: "ESPERAR",
        prob: 60,
        duracion: 3,
        motivo: text.slice(0, 200),
        bullets: []
      };
    }

    // Sanitizar
    const out = {
      ok: true,
      entry: (parsed.entry || "ESPERAR").toUpperCase(),
      prob: Math.max(55, Math.min(95, parseInt(parsed.prob || 60, 10))),
      duracion: [2, 3].includes(parsed.duracion) ? parsed.duracion : 3,
      motivo: parsed.motivo || "",
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 6) : []
    };
    return res.json(out);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("AI server up on", PORT));
