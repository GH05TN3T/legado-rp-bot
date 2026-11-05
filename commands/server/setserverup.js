const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder
} = require("discord.js");

const db = require("../../database");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("setserverup")
        .setDescription("Configura el canal donde se enviará el Server Up.")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )
        .addChannelOption(option =>
            option
                .setName("canal")
                .setDescription("Canal donde se enviará el Server Up")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        ),

    async execute(interaction) {

        const channel = interaction.options.getChannel("canal");

        db.prepare(`
            INSERT INTO config(guildId, serverUpChannel)
            VALUES(?, ?)
            ON CONFLICT(guildId)
            DO UPDATE SET
            serverUpChannel = excluded.serverUpChannel
        `).run(
            interaction.guild.id,
            channel.id
        );

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("✅ Canal configurado")
            .setDescription(
                `El Server Up ahora se enviará en ${channel}.`
            )
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });

    }

};