/**
 * JOIN SLASH COMMAND
 * This command allows GolfoBot to join a specified voice channel
 * If the user is in a voice channel and uses this command without specifying the voice channel,
 * GolfoBot will join the channel the user is in
 */

const { SlashCommandBuilder, ChannelType } = require('discord.js')
const { handleVoiceBehavior } = require('../voice_modules/handle_voice_behavior')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Join a voice channel')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The voice channel to join')
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(false)
    ),
  
  async execute(interaction, client) {
    let channel = interaction.options.getChannel('channel')
    
    if (!channel) {
      channel = interaction.member.voice.channel
      
      if (!channel) {
        return interaction.reply({
          content: "❌ Debes especificar a que canal quieres que me una!",
          ephemeral: true
        })
      }
    }

    if (channel.type !== ChannelType.GuildVoice) {
      return interaction.reply({
        content: "❌ Ese no es un canal de voz!",
        ephemeral: true
      })
    }

    await interaction.reply(`✅ Uniendome a **${channel.name}**...`)

    try {
      await handleVoiceBehavior(channel, client)
      await interaction.followUp(`🎧 Ahora escuchando en **${channel.name}**!`)
    } catch (error) {
      console.error('Error joining voice channel:', error)
      await interaction.followUp('❌ Error al unirme al canal de voz.')
    }
  }
}