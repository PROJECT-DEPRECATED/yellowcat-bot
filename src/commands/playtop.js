const { MessageEmbed, GuildMember } = require("discord.js");
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("playtop")
        .setDescription('Play a song before the next in your channel!')
        .addStringOption(option =>
            option.setName("query")
                .setDescription("The song you want to play")
                .setRequired(true)
        ),
    async execute(interaction, player) {
        try {
            if (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channel) {
                return void interaction.reply({
                    content: 'You are not in a voice channel!',
                    ephemeral: true,
                });
            }
  
            if (
                interaction.guild.me.voice.channelId &&
                interaction.member.voice.channelId !== interaction.guild.me.voice.channelId
            ) {
                return void interaction.reply({
                    content: 'You are not in my voice channel!',
                    ephemeral: true,
                });
            }
  
            await interaction.deferReply();
  
            const query = interaction.options.get('query').value;
            const searchResult = await player.search(query, {
                    requestedBy: interaction.user,
                    searchEngine: QueryType.AUTO,
                })
                .catch(() => {});
            if (!searchResult || !searchResult.tracks.length)
                return void interaction.followUp({content: 'No results were found!'});
  
            const queue = await player.createQueue(interaction.guild, {
                ytdlOptions: {
                    quality: "highest",
                    filter: "audioonly",
                    highWaterMark: 1 << 25,
                    dlChunkSize: 0,
                },
                metadata: interaction.channel,
            });
  
            try {
                if (!queue.connection) await queue.connect(interaction.member.voice.channel);
            } catch {
                void player.deleteQueue(interaction.guildId);
                return void interaction.followUp({
                    content: 'Could not join your voice channel!',
                });
            }
  
            await interaction.followUp({
                content: `⏱ | Loading your ${searchResult.playlist ? 'playlist' : 'track'}...`,
            });
            searchResult.playlist ? queue.insert(searchResult.tracks, 0) : queue.insert(searchResult.tracks[0], 0);
            if (!queue.playing) await queue.play();
        } catch (error) {
            console.log(error);
            interaction.followUp({
                content: 'There was an error trying to execute that command: ' + error.message,
            });
        }
    },
};