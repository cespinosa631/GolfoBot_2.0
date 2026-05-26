const { SlashCommandBuilder } = require('discord.js')
const { getVoiceConnection } = require('@discordjs/voice')
const { botDeafenState } = require('../voice_modules/botState')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deafen')
    .setDescription('Deafen or undeafen the bot')
    .addBooleanOption(option =>
      option
        .setName('deafened')
        .setDescription('True to deafen, False to undeafen')
        .setRequired(true)
    ),

  async execute(interaction) {
    const shouldDeafen = interaction.options.getBoolean('deafened')

    const connection = getVoiceConnection(interaction.guildId)

    if (!connection) {
      return interaction.reply({
        content: '❌ GolfoBot no está en un canal de voz!',
        flags: 64
      })
    }

    const voiceChannel = interaction.guild.channels.cache.get(connection.joinConfig.channelId)

    if (!voiceChannel) {
      return interaction.reply({
        content: '❌ No puedo encontrar el canal de voz!',
        flags: 64
      })
    }

    try {
      // Update the deafen state
      botDeafenState.set(interaction.guildId, shouldDeafen)

      connection.rejoin({
        channelId: voiceChannel.id,
        selfDeaf: shouldDeafen,
        selfMute: false
      })

      await interaction.reply({
        content: shouldDeafen 
          ? '🔇 GolfoBot está ahora sordo y no escuchará el chat de voz.' 
          : '👂 GolfoBot ahora puede escuchar el chat de voz.',
        flags: 64
      })
    } catch (error) {
      console.error('Error toggling deafen:', error)
      await interaction.reply({
        content: '❌ Error al alternar el estado de sordo.',
        flags: 64
      })
    }
  }
}