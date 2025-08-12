const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// --- rutas básicas para probar ---
app.get("/", (req, res) => res.send("OK"));
app.get("/health", (req, res) => res.json({ ok: true, ts: Date.now() }));

// --- endpoint de análisis (por ahora dummy) ---
app.post("/analyze", (req, res) => {
  // sólo para verificar que responde; luego metemos la lógica/IA
  return res.json({
    decision: "ESPERAR",
    prob: 0.55,
    duration: "3m",
    reason: "Servidor OK, endpoint /analyze respondiendo.",
    debug: { payloadKeys: Object.keys(req.body || {}) }
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`AI server up on ${PORT}`));

