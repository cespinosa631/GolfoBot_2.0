const { SlashCommandBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder().setName("leave").setDescription("Leave the voice channel"),

  async execute(interaction) {
    const channel = interaction.member.voice.channel

    if (!channel) {
      return interaction.reply({
        content: "❌ No estoy en un canal de voz!",
        flags: 64
      })
    }

    const { voiceConnections, audioPlayers, conversationHistory } = require("../voice_modules/handle_voice_behavior")
    const connection = voiceConnections.get(interaction.guildId)

    if (!connection) {
      return interaction.reply({
        content: "❌ No estoy en un canal de voz!",
        flags: 64
      })
    }

    connection.destroy()
    voiceConnections.delete(interaction.guildId)
    audioPlayers.delete(interaction.guildId)
    conversationHistory.delete(interaction.guildId)

    await interaction.reply(`👋 Me salí de **${channel.name}**!`)
  }
}
