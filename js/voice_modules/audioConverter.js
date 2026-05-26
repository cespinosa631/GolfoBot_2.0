const { spawn } = require("child_process")

async function convertPcmToWav(pcmPath, wavPath) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-f", "s16le",        // Input format: signed 16-bit little-endian
      "-ar", "48000",       // Input sample rate: 48kHz
      "-ac", "2",           // Input channels: 2 (stereo from Discord)
      "-i", pcmPath,        // Input file
      "-ar", "16000",       // Output sample rate: 16kHz (optimal for speech recognition)
      "-ac", "1",           // Output channels: 1 (mono - required by Google Speech)
      "-y",                 // Overwrite output
      wavPath               // Output file
    ])

    let errorOutput = ""

    ffmpeg.stderr.on("data", data => {
      errorOutput += data.toString()
    })

    ffmpeg.on("close", code => {
      if (code === 0) {
        resolve()
      } else {
        console.error("FFmpeg error:", errorOutput)
        reject(new Error(`ffmpeg exited with code ${code}`))
      }
    })

    ffmpeg.on("error", err => {
      reject(new Error(`Failed to start ffmpeg: ${err.message}`))
    })
  })
}

module.exports = { convertPcmToWav }