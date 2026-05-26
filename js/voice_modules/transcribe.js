const speech = require('@google-cloud/speech');
const fs = require('fs');
require("dotenv").config()

const GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS
// Initialize the Speech client
const client = new speech.SpeechClient({
  keyFilename: GOOGLE_APPLICATION_CREDENTIALS
});

async function transcribeAudio(wavPath) {
  try {
    // Read the audio file
    const audioBytes = fs.readFileSync(wavPath).toString('base64');

    const audio = {
      content: audioBytes,
    };

    const config = {
      encoding: 'LINEAR16', // Adjust based on your WAV format
      // sampleRateHertz: 16000, // Uncomment and set if known
      languageCode: 'es-419', // Change as needed
      enableAutomaticPunctuation: true,
      model: 'default', // Good for general transcription
    };

    const request = {
      audio: audio,
      config: config,
    };

    // console.log('   Sending audio to Google Cloud Speech-to-Text...');
    // Sending audio to Google STT
    const [response] = await client.recognize(request);
    
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    // console.log(`   Transcription result: "${transcription}"`);
    return transcription.trim();
  } catch (error) {
    console.error('Google Cloud Speech error:', error.message);
    return '';
  }
}

module.exports = { transcribeAudio };

/*************** TRANSCRIBE USING LOCAL WHISPER ***************/
// const axios = require("axios")
// const fs = require("fs")
// const FormData = require("form-data")

// async function transcribeAudio(wavPath) {
//   try {
//     const form = new FormData()
//     form.append("file", fs.createReadStream(wavPath))
//     form.append("temperature", "0.0")
//     form.append("response_format", "json")

//     const response = await axios.post(
//       "http://localhost:8080/inference",
//       form,
//       {
//         headers: {
//           ...form.getHeaders()
//         }
//       }
//     )

//     const transcription = response.data.text || ""
//     console.log(`   Transcription result: "${transcription}"`)
//     return transcription.trim()
//   } catch (error) {
//     console.error("Whisper server error:", error.message)
//     return ""
//   }
// }

// module.exports = { transcribeAudio }
