const path = require("path");
const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    AttachmentBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("panelsugerencias")
        .setDescription("Publica el panel para recibir sugerencias de la comunidad.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addChannelOption(option =>
            option
                .setName("canal_panel")
                .setDescription("Canal donde aparecerá el panel.")
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(true)
        )
        .addChannelOption(option =>
            option
                .setName("canal_sugerencias")
                .setDescription("Canal donde se publicarán las sugerencias enviadas.")
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(true)
        ),

    async execute(interaction) {
        const panelChannel = interaction.options.getChannel("canal_panel", true);
        const suggestionsChannel = interaction.options.getChannel("canal_sugerencias", true);

        if (!panelChannel.isTextBased() || !suggestionsChannel.isTextBased()) {
            return interaction.reply({
                content: "❌ Debes seleccionar canales de texto.",
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const banner = new AttachmentBuilder(
            path.join(__dirname, "..", "..", "assets", "legado-sugerencias.png"),
            { name: "legado-sugerencias.png" }
        );

        const bannerEmbed = new EmbedBuilder()
            .setColor(0x168BFF)
            .setImage("attachment://legado-sugerencias.png");

        const panelEmbed = new EmbedBuilder()
            .setColor(0x168BFF)
            .setTitle("💡 Panel de Sugerencias")
            .setDescription([
                "### ¿Cómo funciona?",
                "1. Presiona el botón de abajo.",
                "2. Ingresa el título y los detalles de tu sugerencia.",
                "3. Envíala y deja que la comunidad vote.",
                "",
                "`Tus ideas ayudan a mejorar Legado Roleplay y a tomar decisiones con la comunidad.`"
            ].join("\n"))
            .setFooter({ text: "Legado Roleplay • Cada opinión cuenta" });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`suggestion_open:${suggestionsChannel.id}`)
                .setLabel("Publicar Sugerencia")
                .setEmoji("💡")
                .setStyle(ButtonStyle.Primary)
        );

        await panelChannel.send({
            embeds: [bannerEmbed, panelEmbed],
            components: [row],
            files: [banner],
            allowedMentions: { parse: [] }
        });

        await interaction.editReply(
            `✅ Panel publicado en ${panelChannel}. Las sugerencias aparecerán en ${suggestionsChannel}.`
        );
    }
};
