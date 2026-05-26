const { Client, GatewayIntentBits, Collection } = require("discord.js")
// const { handleVoiceBehavior } = require("./voice_modules/handle_voice_behavior")
const { deployCommands } = require("./deploy_commands")

const fs = require('fs')
const path = require('path')
require("dotenv").config()

// bot token & id
const TOKEN = process.env.BOT_TOKEN
const CLIENT_ID = process.env.BOT_ID

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
})
// Load commands
client.commands = new Collection()
const commandsPath = path.join(__dirname, 'slash_commands')
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file)
  const command = require(filePath)
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command)
  }
}

// bot login
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`)
  await deployCommands(TOKEN, CLIENT_ID)
})

// Handle slash command interactions
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return

  const command = client.commands.get(interaction.commandName)

  if (!command) {
    console.error(`❌ No command matching ${interaction.commandName} was found.`)
    return
  }

  try {
    await command.execute(interaction, client)
  } catch (error) {
    console.error(`❌ Error executing ${interaction.commandName}:`, error)
    const reply = { 
      content: '❌ Hubo un error al ejecutar este comando!', 
      ephemeral: true 
    }
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply)
    } else {
      await interaction.reply(reply)
    }
  }
})

client.login(TOKEN)