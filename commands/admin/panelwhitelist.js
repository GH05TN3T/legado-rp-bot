const path = require("path");
const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("panelwhitelist")
        .setDescription("Publicar el panel de whitelist de Legado Roleplay.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const banner = new AttachmentBuilder(
            path.join(__dirname, "..", "..", "assets", "legado-banner.png"),
            { name: "legado-whitelist.png" }
        );

        const embed = new EmbedBuilder()
            .setColor(0x66C7FF)
            .setTitle("💙 WHITELIST • LEGADO ROLEPLAY")
            .setDescription(
                "¿Estás listo para comenzar una nueva historia?\n\n" +
                "Pulsa el botón de abajo y completa nuestra entrevista de Roleplay. " +
                "Tus respuestas serán analizadas y enviadas al equipo de administración para tomar la decisión final.\n\n" +
                "**Lee cuidadosamente, responde con sinceridad y demuestra tu conocimiento de rol.**"
            )
            .addFields(
                { name: "🤖 Evaluación inteligente", value: "Tus respuestas serán revisadas con ayuda de IA.", inline: true },
                { name: "🛡️ Decisión del staff", value: "La aprobación final siempre la realizará un miembro del equipo.", inline: true }
            )
            .setImage("attachment://legado-whitelist.png")
            .setFooter({ text: "Legado Roleplay • Construimos historias juntos." });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("wl_start")
                .setLabel("Realizar Whitelist")
                .setEmoji("📝")
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({ embeds: [embed], components: [row], files: [banner] });
    }
};
