import OpenAI, { toFile } from "openai";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("[transcribe] request received");

  try {
    const { audioBase64, language = "sr" } = req.body || {};

    if (!audioBase64) {
      console.log("[transcribe] missing audioBase64");
      return res.status(400).json({ error: "audioBase64 is required" });
    }

    // LOG: dužina i prefix
    console.log("[transcribe] audioBase64 length:", audioBase64.length);
    console.log(
      "[transcribe] audioBase64 prefix:",
      audioBase64.slice(0, 50).replace(/\s/g, "")
    );

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("[transcribe] OPENAI_API_KEY missing");
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    const openai = new OpenAI({ apiKey });

    // Očisti data: prefix ako postoji
    const base64Clean = audioBase64.replace(
      /^data:audio\/[a-zA-Z0-9.+-]+;base64,/,
      ""
    );

    const audioBuffer = Buffer.from(base64Clean, "base64");
    console.log("[transcribe] buffer length:", audioBuffer.length);

    const file = await toFile(audioBuffer, "audio.m4a", {
      contentType: "audio/m4a",
    });

    const response = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language,
    });

    console.log("[transcribe] success");

    return res.status(200).json({
      text: response.text,
      success: true,
    });
  } catch (error) {
    console.error("[transcribe] error:", error);

    if (error.response) {
      console.error(
        "[transcribe] OpenAI response error:",
        error.response.status,
        error.response.data
      );
    }

    return res.status(500).json({
      error:
        error?.message ||
        (typeof error === "string" ? error : "Transcription failed"),
      success: false,
    });
  }
}
