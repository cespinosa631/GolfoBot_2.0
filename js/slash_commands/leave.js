const { SlashCommandBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder().setName("leave").setDescription("Leave the voice channel"),

  async execute(interaction) {
    const { voiceConnections, audioPlayers, conversationHistory, leavingGuilds } = require("../voice_modules/handle_voice_behavior")
    const connection = voiceConnections.get(interaction.guildId)

    if (!connection) {
      return interaction.reply({
        content: "❌ No estoy en un canal de voz!",
        flags: 64
      })
    }

    // Get the bot's current voice channel (not the member's)
    const botVoiceChannel = interaction.guild.members.me.voice.channel

    // Mark this guild as intentionally leaving BEFORE destroying,
    // so voiceStateUpdate handlers can ignore the triggered events
    leavingGuilds.add(interaction.guildId)

    connection.destroy()
    voiceConnections.delete(interaction.guildId)
    audioPlayers.delete(interaction.guildId)
    conversationHistory.delete(interaction.guildId)

    // Clean up the flag after a short delay (enough for events to fire and be ignored)
    setTimeout(() => leavingGuilds.delete(interaction.guildId), 2000)

    const channelName = botVoiceChannel?.name ?? "el canal de voz"
    await interaction.reply(`👋 Me salí de **${channelName}**!`)
  }
}
