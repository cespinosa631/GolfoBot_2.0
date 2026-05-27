/**
 * This script handles the voice channel behavior of GolfoBot:
 * 1. Joining a voice channel when the /join command is used
 * 2. Listening to users in the voice channel and transcribing their speech
 * 3. Sending the transcriptions to the LLM and getting a response
 * 4. Converting the LLM response to speech and playing it back in the voice channel
 * 5. Alternating between deafened (when speaking) and undeafened (when listening) states
 * 6. Maintaining conversation context for more relevant responses
 * 7. Only responding when addressed or randomly (1% chance) to keep interactions natural
 */
const { Client, GatewayIntentBits } = require("discord.js")
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require("@discordjs/voice")
const { convertPcmToWav } = require("./audioConverter")
const { transcribeAudio } = require("./transcribe")
const { getLLMResponse } = require("./llm")
const { textToSpeech } = require("./elevenlabs")
const { botDeafenState } = require("./botState")

require("dotenv").config()

// required variables to listen to audio in voice channel
const { EndBehaviorType } = require("@discordjs/voice")
const prism = require("prism-media")

const fs = require("fs")

// Store conversation context per guild
const conversationHistory = new Map()
// Track active recordings to prevent duplicates
const activeRecordings = new Set()
// Store voice connections per guild
const voiceConnections = new Map()
// Store audio players per guild for playing TTS responses
const audioPlayers = new Map()
// addressing keywords
const keywords = ["golfo", "golfobot", "golfito", "golfo bot", "golfo-bot"]

async function handleVoiceBehavior(channel, client) {
  const guildId = channel.guild.id

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: false
  })

  voiceConnections.set(guildId, connection)

  if (!audioPlayers.has(guildId)) {
    const player = createAudioPlayer()
    audioPlayers.set(guildId, player)
    connection.subscribe(player)
  }

  /*  *******************LISTENING TO VOICE CHANNEL BEGINS**********************  */
  const receiver = connection.receiver

  /* ++++++++++++++++++++++++++++GOLFOBOT GREETING USERS BEGINS ++++++++++++++++++++++++++++++ */
  // Listen for users joining the voice channel
  client.on("voiceStateUpdate", async (oldState, newState) => {
    // Only process for this guild
    if (newState.guild.id !== guildId) return

    // Check if user joined the voice channel (wasn't in voice before, now is)
    if (!oldState.channelId && newState.channelId === channel.id) {
      // Don't greet the bot itself
      if (newState.member.user.bot) return

      const nickname = newState.member.displayName
      const greeting = `${nickname}, ¡sálte!`

      console.log(`👋 Greeting user: ${greeting}`)

      try {
        // Generate TTS for greeting
        const timestamp = Date.now()
        const ttsPath = `./recordings/greeting-${timestamp}.mp3`
        const success = await textToSpeech(greeting, ttsPath)

        if (success) {
          // Make bot deaf while speaking
          connection.rejoin({
            channelId: channel.id,
            selfDeaf: true,
            selfMute: false
          })

          const resource = createAudioResource(ttsPath)
          const player = audioPlayers.get(guildId)
          player.play(resource)

          // When done, undeafen and clean up
          player.once(AudioPlayerStatus.Idle, () => {
            connection.rejoin({
              channelId: channel.id,
              selfDeaf: false,
              selfMute: false
            })

            try {
              fs.unlinkSync(ttsPath)
            } catch (e) {}
          })
        }
      } catch (error) {
        console.error("Error playing greeting:", error)
      }
    }
  })
  /* ++++++++++++++++++++++++++++GOLFOBOT GREETING USERS ENDS ++++++++++++++++++++++++++++++ */

  receiver.speaking.on("start", userId => {
    // Check if bot is deafened - if so, ignore all audio
    if (botDeafenState.get(guildId)) {
      // console.log(`🔇 Bot is deafened, ignoring audio from user ${userId}`)
      return
    }
    // Prevent duplicate recordings for the same user
    if (activeRecordings.has(userId)) {
      console.log(`⏭️  Skipping duplicate recording for user ${userId}`)
      return
    }
    activeRecordings.add(userId)
    console.log(`🎤 User ${userId} started speaking`)

    const opusStream = receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: 1000
      }
    })
    console.log("Processing audio stream...")

    const decoder = new prism.opus.Decoder({
      frameSize: 960,
      channels: 2,
      rate: 48000
    })

    decoder.on("error", err => {
      console.error("❌ Opus decoder error:", err.message)

      // cleanup active recording
      activeRecordings.delete(userId)

      // destroy streams safely
      opusStream.destroy()
      decoder.destroy()
    })

    const pcmStream = opusStream.pipe(decoder)

    const timestamp = Date.now()
    const pcmPath = `./recordings/${userId}-${timestamp}.pcm`
    const wavPath = `./recordings/${userId}-${timestamp}.wav`
    const output = fs.createWriteStream(pcmPath)

    pcmStream.pipe(output)
    /*  *******************LISTENING TO VOICE CHANNEL ENDS**********************  */

    /*  *******************AUDIO TRANSCRIPTION BEGINS**********************  */
    output.on("finish", async () => {
      try {
        console.log("🔄 Converting PCM to WAV...")
        await convertPcmToWav(pcmPath, wavPath)

        console.log("🎯 Transcribing audio...")
        const transcription = await transcribeAudio(wavPath)

        if (!transcription || transcription.trim() === "") {
          console.log("⚠️  No speech detected")
          fs.unlinkSync(pcmPath)
          fs.unlinkSync(wavPath)
          activeRecordings.delete(userId) // Remove from active set
          return
        }

        console.log(`📝 Transcription: "${transcription}"`)

        // check if bot is being addressed
        const lowerTranscription = transcription.toLowerCase()
        const isAddressingBot = keywords.some(keyword => lowerTranscription.includes(keyword))

        /*  *******************AUDIO TRANSCRIPTION ENDS**********************  */

        /**********************GETTING LLM RESPONSE BEGINS****************** */
        // update conversation history
        const user = await client.users.fetch(userId)
        const username = user.displayName

        let history = conversationHistory.get(channel.guild.id)
        if (!history) {
          history = []
          conversationHistory.set(channel.guild.id, history)
        }
        history.push({
          role: "user",
          content: `${username}: ${transcription}`
        })

        if (history.length > 10) {
          history.shift()
        }
        console.log("📜 Conversation history:", history)

        // decide to respond or not
        if (!isAddressingBot) {
          // roll a dice to decide if bot should respond anyway (1% chance)
          const randomNum = Math.random()
          if (randomNum < 0.01) {
            console.log("🎲 Rolled the dice and decided to respond anyway!")
          } else {
            // not addressing bot, ignoring message
            console.log("⚠️  Bot not addressed, ignoring message")
            fs.unlinkSync(pcmPath)
            fs.unlinkSync(wavPath)
            activeRecordings.delete(userId) // Remove from active set
            return
          }
        }
        // console.log("📜 Conversation history (whole):", conversationHistory)

        // get LLM response
        console.log("🤖 Getting LLM response...")
        const llmResponse = await getLLMResponse(history)

        console.log(`💬 LLM: ${llmResponse}`)

        /**********************GETTING LLM RESPONSE ENDS****************** */

        /**********************GETTING & PLAYING ELEVEN LABS AUDIO BEGINS****************** */
        // Convert to speech and play in voice channel
        const ttsPath = `./recordings/tts-${timestamp}.mp3`
        console.log("🎙️  Generating speech...")
        const success = await textToSpeech(llmResponse, ttsPath)

        if (success) {
          // Deafen bot before speaking to avoid feedback loop
          console.log("🔊 Playing audio in voice channel, bot deafened...")
          const resource = createAudioResource(ttsPath)
          const player = audioPlayers.get(channel.guild.id)

          connection.rejoin({
            channelId: channel.id,
            selfDeaf: true, // Can't hear while speaking
            selfMute: false
          })

          // Safety check
          if (!player) {
            console.error("⚠️ Audio player not found for guild", guildId)
            console.log("Creating new audio player...")
            // Create one if it doesn't exist
            const newPlayer = createAudioPlayer()
            audioPlayers.set(guildId, newPlayer)
            const conn = connection // Make sure connection is accessible here
            conn.subscribe(newPlayer)
            newPlayer.play(resource)
          } else {
            player.play(resource)
          }

          // When done, UNDEAFEN and start listening again
          const activePlayer = audioPlayers.get(guildId)
          activePlayer.once(AudioPlayerStatus.Idle, () => {
            console.log("👂 Bot listening again...")
            connection.rejoin({
              channelId: channel.id,
              selfDeaf: false, // Start listening again
              selfMute: false
            })

            // Delete TTS file after playing
            try {
              fs.unlinkSync(ttsPath)
              console.log("🗑️  Deleted TTS file")
            } catch (e) {
              console.error("Error deleting TTS file:", e)
            }
          })
        }
        // Remove from active set
        activeRecordings.delete(userId)
        // Clean up files
        fs.unlinkSync(pcmPath)
        fs.unlinkSync(wavPath)
        /**********************GETTING & PLAYING ELEVEN LABS AUDIO ENDS****************** */
      } catch (err) {
        console.error("Error processing audio:", err)
      }
    })
  })
}
module.exports = { handleVoiceBehavior, voiceConnections, audioPlayers, conversationHistory }
