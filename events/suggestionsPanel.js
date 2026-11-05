const path = require("path");
const {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");
const db = require("../database");

const CHANNEL_ID = /^\d{17,20}$/;

function cleanText(value, maxLength) {
    return String(value || "")
        .trim()
        .slice(0, maxLength)
        .replace(/@/g, "@\u200b");
}

function votingRow(upVotes, downVotes) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("suggestion_vote_up")
            .setLabel(String(upVotes))
            .setEmoji("👍")
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId("suggestion_vote_down")
            .setLabel(String(downVotes))
            .setEmoji("👎")
            .setStyle(ButtonStyle.Danger)
    );
}

function suggestionPanel(channelId) {
    const banner = new AttachmentBuilder(
        path.join(__dirname, "..", "assets", "legado-sugerencias.png"),
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
            .setCustomId(`suggestion_open:${channelId}`)
            .setLabel("Publicar Sugerencia")
            .setEmoji("💡")
            .setStyle(ButtonStyle.Primary)
    );

    return {
        embeds: [bannerEmbed, panelEmbed],
        components: [row],
        files: [banner],
        allowedMentions: { parse: [] }
    };
}

const saveVote = db.transaction((messageId, userId, vote) => {
    const current = db.prepare(
        "SELECT vote FROM suggestion_votes WHERE messageId = ? AND userId = ?"
    ).get(messageId, userId);

    let action;
    if (current?.vote === vote) {
        db.prepare("DELETE FROM suggestion_votes WHERE messageId = ? AND userId = ?")
            .run(messageId, userId);
        action = "removed";
    } else {
        db.prepare(`
            INSERT INTO suggestion_votes (messageId, userId, vote)
            VALUES (?, ?, ?)
            ON CONFLICT(messageId, userId) DO UPDATE SET vote = excluded.vote
        `).run(messageId, userId, vote);
        action = "saved";
    }

    const counts = db.prepare(`
        SELECT
            SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END) AS upVotes,
            SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END) AS downVotes
        FROM suggestion_votes
        WHERE messageId = ?
    `).get(messageId);

    return {
        action,
        upVotes: Number(counts.upVotes || 0),
        downVotes: Number(counts.downVotes || 0)
    };
});

module.exports = {
    name: "interactionCreate",

    async execute(interaction) {
        try {
            if (interaction.isButton() && interaction.customId.startsWith("suggestion_open:")) {
                const channelId = interaction.customId.split(":")[1];
                if (!CHANNEL_ID.test(channelId)) return;

                const modal = new ModalBuilder()
                    .setCustomId(`suggestion_submit:${channelId}`)
                    .setTitle("Nueva sugerencia • Legado Roleplay");

                const title = new TextInputBuilder()
                    .setCustomId("suggestion_title")
                    .setLabel("Título de la sugerencia")
                    .setPlaceholder("Ej.: Añadir nuevos trabajos legales")
                    .setStyle(TextInputStyle.Short)
                    .setMinLength(3)
                    .setMaxLength(100)
                    .setRequired(true);

                const details = new TextInputBuilder()
                    .setCustomId("suggestion_details")
                    .setLabel("Explica tu idea")
                    .setPlaceholder("Describe cómo funcionaría y por qué mejoraría el servidor...")
                    .setStyle(TextInputStyle.Paragraph)
                    .setMinLength(10)
                    .setMaxLength(1800)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(title),
                    new ActionRowBuilder().addComponents(details)
                );

                return interaction.showModal(modal);
            }

            if (interaction.isModalSubmit() && interaction.customId.startsWith("suggestion_submit:")) {
                const channelId = interaction.customId.split(":")[1];
                if (!CHANNEL_ID.test(channelId)) return;

                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
                if (!channel?.isTextBased()) {
                    return interaction.editReply("❌ El canal de sugerencias ya no existe o no está disponible.");
                }

                const title = cleanText(interaction.fields.getTextInputValue("suggestion_title"), 100);
                const details = cleanText(interaction.fields.getTextInputValue("suggestion_details"), 1800);

                const embed = new EmbedBuilder()
                    .setColor(0x168BFF)
                    .setAuthor({
                        name: `Sugerencia de ${interaction.member?.displayName || interaction.user.username}`,
                        iconURL: interaction.user.displayAvatarURL()
                    })
                    .setTitle(`💡 ${title}`)
                    .setDescription(details)
                    .addFields({
                        name: "🗳️ Votación",
                        value: "Usa los botones para apoyar o rechazar esta sugerencia. Puedes cambiar tu voto.",
                        inline: false
                    })
                    .setFooter({ text: "Legado Roleplay • Sugerencia abierta" })
                    .setTimestamp();

                const message = await channel.send({
                    embeds: [embed],
                    components: [votingRow(0, 0)],
                    allowedMentions: { parse: [] }
                });

                db.prepare(`
                    INSERT INTO suggestions
                        (messageId, guildId, channelId, authorId, title, details, status, createdAt)
                    VALUES (?, ?, ?, ?, ?, ?, 'open', ?)
                `).run(
                    message.id,
                    interaction.guildId,
                    channel.id,
                    interaction.user.id,
                    title,
                    details,
                    new Date().toISOString()
                );

                // Mantiene el botón siempre al final del canal para facilitar
                // que cualquier usuario pueda enviar otra sugerencia.
                await channel.send(suggestionPanel(channel.id));

                return interaction.editReply(`✅ Tu sugerencia fue publicada en ${channel}.`);
            }

            if (interaction.isButton() && ["suggestion_vote_up", "suggestion_vote_down"].includes(interaction.customId)) {
                const suggestion = db.prepare(
                    "SELECT status FROM suggestions WHERE messageId = ? AND guildId = ?"
                ).get(interaction.message.id, interaction.guildId);

                if (!suggestion) {
                    return interaction.reply({
                        content: "❌ Esta sugerencia no está registrada.",
                        flags: MessageFlags.Ephemeral
                    });
                }

                if (suggestion.status !== "open") {
                    return interaction.reply({
                        content: "🔒 La votación de esta sugerencia está cerrada.",
                        flags: MessageFlags.Ephemeral
                    });
                }

                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const vote = interaction.customId === "suggestion_vote_up" ? 1 : -1;
                const result = saveVote(interaction.message.id, interaction.user.id, vote);

                await interaction.message.edit({
                    components: [votingRow(result.upVotes, result.downVotes)]
                });

                return interaction.editReply(
                    result.action === "removed"
                        ? "↩️ Quitaste tu voto."
                        : vote === 1
                            ? "✅ Votaste a favor."
                            : "✅ Votaste en contra."
                );
            }
        } catch (error) {
            console.error("[SUGGESTIONS ERROR]", error);

            const content = "❌ No pude completar esa acción. Revisa mis permisos e inténtalo otra vez.";
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(content).catch(() => null);
            } else {
                await interaction.reply({ content, flags: MessageFlags.Ephemeral }).catch(() => null);
            }
        }
    }
};
