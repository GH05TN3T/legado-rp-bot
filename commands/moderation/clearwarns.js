const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");

const db = require("../../database");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("clearwarns")
        .setDescription("Eliminar todas las advertencias de un usuario.")
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

        db.prepare(`
            DELETE FROM warnings
            WHERE guildId = ?
            AND userId = ?
        `).run(
            interaction.guild.id,
            user.id
        );

        const embed = new EmbedBuilder()
            .setColor("#57F287")
            .setTitle("✅ Advertencias eliminadas")
            .setDescription(
                `Las advertencias de ${user} fueron eliminadas correctamente.`
            )
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });

    }

};