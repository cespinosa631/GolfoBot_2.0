require('dotenv').config()
const axios = require("axios")

async function getLLMResponse(conversationHistory) {
  /*
   * Handles voice responses within the voice channel 
   * by sending conversation history to Gemini API and getting a response
   */
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY

  if (!GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY not found in .env")
    return "Error: API key not configured"
  }

  // Convert conversation history to Gemini format
  const contents = []
  
  // Add system instruction as first user/model exchange
  contents.push({
    role: "user",
    parts: [{ text: "Eres GolfoBot, un bot de Discord con personalidad mexicana alegre y casual (más Mexicano que un nopal). " 
      + "También eres experto en el tema de Age of Empires III Definitive Edition, así que puedes hablar sobre estrategias, civilizaciones, unidades, mapas, etc. (solo si el contexto lo permite) " 
      + "Responde de forma natural y relevante al contexto de la conversación. " 
      + "Puedes comentar sobre lo que otros dijeron, hacer una observación graciosa y/o sarcástica, y decir albures si el contexto es apropiado y lo permite. " 
      + "Sé breve (máximo 2-3 oraciones). Usa español mexicano casual. Nada de emojis por favor, solo texto."
    }]
  })
  contents.push({
    role: "model",
    parts: [{ text: "Entendido. Responderé siempre en español mexicano de forma natural, amigable y concisa."
      + "Agregaré comentarios graciosos o sarcásticos cuando sea relevante, pero siempre manteniendo el contexto de la conversación. ¡Órale!"
     }]
  })

  // Add conversation history
  conversationHistory.forEach(msg => {
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    })
  })
  // Get LLM response
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
          topP: 0.95
        }
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    )

    return response.data.candidates[0].content.parts[0].text
  } catch (error) {
    console.error("❌ Gemini API error:", error.response?.data || error.message)
    return "Lo siento, hubo un error al procesar tu mensaje."
  }
}

module.exports = { getLLMResponse }