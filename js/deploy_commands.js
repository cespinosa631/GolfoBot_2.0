const { REST, Routes } = require('discord.js')
const fs = require('fs')
const path = require('path')

async function deployCommands(token, clientId) {
  const commands = []
  const commandsPath = path.join(__dirname, './slash_commands')
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))

  // Load all command files
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file)
    const command = require(filePath)
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON())
      console.log(`✅ Loaded command: ${command.data.name}`)
    } else {
      console.log(`⚠️  Skipped ${file}: missing 'data' or 'execute'`)
    }
  }

  const rest = new REST({ version: '10' }).setToken(token)

  try {
    console.log(`🔄 Started refreshing ${commands.length} application (/) commands.`)

    const data = await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands },
    )

    console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`)
  } catch (error) {
    console.error('❌ Error deploying commands:', error)
  }
}

module.exports = { deployCommands }