const axios = require("axios")
const fs = require("fs")
require('dotenv').config()
const gTTS = require("gtts")

/* WARNING: In case ElevenLabs fails, fallback to gTTS*/ 
function googleTranslateTTS(text, outputPath) {
  return new Promise((resolve) => {
    console.log("⚠️ Using Google Translate TTS fallback...")

    // "es" = Spanish
    const tts = new gTTS(text, "es")

    tts.save(outputPath, function (err) {
      if (err) {
        console.error("❌ Google Translate TTS failed:", err)
        resolve(false)
      } else {
        console.log("✅ Google Translate TTS success")
        resolve(true)
      }
    })
  })
}

async function textToSpeech(text, outputPath) {
  // const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
  // const VOICE_ID = process.env.ELEVENLABS_VOICE_ID
  const ELEVENLABS_API_KEY = null
  const VOICE_ID = null

  if (!ELEVENLABS_API_KEY) {
    console.error("❌ ELEVENLABS_API_KEY not found in .env")
    return await googleTranslateTTS(text, outputPath)
  }

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        text: text,
        model_id: "eleven_multilingual_v2", // Supports Spanish
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      },
      {
        headers: {
          "Accept": "audio/mpeg",
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json"
        },
        responseType: "stream"
      }
    )

    // Save audio to file
    const writer = fs.createWriteStream(outputPath)
    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
      writer.on("finish", () => resolve(true))
      writer.on("error", reject)
    })
  } catch (error) {
    console.error("❌ ElevenLabs API error:", error.response?.data || error.message)
    // FALLBACK TO GOOGLE TRANSLATE TTS
    return await googleTranslateTTS(text, outputPath)
  }
}

module.exports = { textToSpeech }