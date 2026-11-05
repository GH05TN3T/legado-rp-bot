const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");

const db = require("../../database");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("warnings")
        .setDescription("Ver las advertencias de un usuario.")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )
        .addUserOption(option =>
            option
                .setName("usuario")
                .setDescription("Usuario")
                .setRequired(true)
        ),

    async execute(interaction) {

        const user = interaction.options.getUser("usuario");

        const result = db.prepare(`
            SELECT COUNT(*) total
            FROM warnings
            WHERE guildId = ?
            AND userId = ?
        `).get(
            interaction.guild.id,
            user.id
        );

        const embed = new EmbedBuilder()
            .setColor("#2B90D9")
            .setTitle("📋 Advertencias")
            .setDescription(
                `**Usuario:** ${user}\n\n**Advertencias:** **${result.total}**`
            )
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });

    }

};