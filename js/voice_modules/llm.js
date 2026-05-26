require('dotenv').config()
const axios = require("axios")

async function getLLMResponse(conversationHistory) {
  /*
   * Gestiona las respuestas de voz enviándolas a Gemini API.
   * Si Gemini falla, cambia automáticamente a GROQ como respaldo.
   */
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY
  const GROQ_API_KEY = process.env.GROQ_API_KEY
  const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

  const systemInstruction = "Eres GolfoBot, un bot de Discord con personalidad mexicana alegre y casual (más Mexicano que un nopal). " 
    + "También eres experto en el tema de Age of Empires III Definitive Edition, así que puedes hablar sobre estrategias, civilizaciones, unidades, mapas, etc. (solo si el contexto lo permite) " 
    + "Responde de forma natural y relevante al contexto de la conversación. " 
    + "Puedes comentar sobre lo que otros dijeron, hacer una observación graciosa y/o sarcástica, y decir albures si el contexto es apropiado y lo permite. " 
    + "Sé breve (máximo 2-3 oraciones). Usa español mexicano casual. Nada de emojis por favor, solo texto."

  // === 1. INTENTAR PRIMERO CON GEMINI ===
  if (GEMINI_API_KEY) {
    try {
      // Convertir el historial al formato de Gemini
      const contents = []
      
      // Instrucción del sistema simulada como primer intercambio (Formato Gemini)
      contents.push({
        role: "user",
        parts: [{ text: systemInstruction }]
      })
      contents.push({
        role: "model",
        parts: [{ text: "Entendido. Responderé siempre en español mexicano de forma natural, amigable y concisa. Agregaré comentarios graciosos o sarcásticos cuando sea relevante, pero siempre manteniendo el contexto de la conversación. ¡Órale!" }]
      })

      // Agregar historial de conversación existente
      conversationHistory.forEach(msg => {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        })
      })

      console.log("🤖 Llamando a Gemini API...")
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
      console.log("⚠️ Gemini falló. Intentando conectar con Groq...")
    }
  } else {
    console.warn("⚠️ GEMINI_API_KEY no configurada en el archivo .env")
  }

  // === 2. FALLBACK: INTENTAR CON GROQ ===
  if (!GROQ_API_KEY) {
    console.error("❌ Ni GEMINI_API_KEY ni GROQ_API_KEY están disponibles.")
    return "Lo siento, carnal, no tengo ninguna API Key configurada para responderte ahorita."
  }

  try {
    // Formatear el historial al estándar de OpenAI/Groq (system, user, assistant)
    const groqMessages = []
    
    // Groq sí soporta el rol de sistema nativo de forma limpia
    groqMessages.push({
      role: "system",
      content: systemInstruction
    })

    // Mapeamos el historial cambiando "model" por "assistant"
    conversationHistory.forEach(msg => {
      groqMessages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content
      })
    })

    console.log(`⚡ Usando Groq como respaldo con el modelo: ${GROQ_MODEL}`)
    const groqResponse = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: GROQ_MODEL,
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 800
      },
      {
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    )

    return groqResponse.data.choices[0].message.content

  } catch (groqError) {
    console.error("❌ Groq API error:", groqError.response?.data || groqError.message)
    return "Lo siento, carnal, ando experimentando fallas en todos mis sistemas de IA. Inténtalo de nuevo en un ratito."
  }
}

module.exports = { getLLMResponse }