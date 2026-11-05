const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");
const db = require("../database");
const config = require("../config");
const { buildWhitelistModal } = require("../commands/general/whitelist");

const REVIEW_CHANNEL_ID = config.whitelistReviewChannelId;
const WHITELIST_ROLE_ID = config.whitelistRoleId;

function clean(value, max = 1000) {
    const text = String(value || "Sin información").replace(/```/g, "'''");
    return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function manualEvaluation() {
    return {
        score: null,
        recommendation: "revision_manual",
        summary: "Solicitud recibida y pendiente de revisión manual por el staff.",
        strengths: "Consulta las respuestas completas de la persona solicitante.",
        concerns: "La decisión final debe tomarla un miembro autorizado del staff."
    };
}

function decisionButtons(applicationId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`wl_approve:${applicationId}`)
            .setLabel("Aprobar")
            .setEmoji("✅")
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`wl_reject:${applicationId}`)
            .setLabel("Rechazar")
            .setEmoji("❌")
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`wl_repeat:${applicationId}`)
            .setLabel("Permitir repetir")
            .setEmoji("🔄")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled)
    );
}

function resultEmbed(application, user, evaluation) {
    const score = evaluation.score === null ? "Sin evaluar" : `${evaluation.score}/100`;
    return new EmbedBuilder()
        .setColor(0x66C7FF)
        .setTitle("💙 Nueva solicitud de Whitelist • Legado Roleplay")
        .setDescription(`Solicitud de ${user} (${user.tag})`)
        .addFields(
            { name: "Puntuación", value: `\`${score}\``, inline: true },
            { name: "Recomendación", value: `\`${clean(evaluation.recommendation, 40)}\``, inline: true },
            { name: "ID de solicitud", value: `\`#${application.id}\``, inline: true },
            { name: "Resumen", value: clean(evaluation.summary) },
            { name: "Fortalezas", value: clean(evaluation.strengths) },
            { name: "Puntos a revisar", value: clean(evaluation.concerns) },
            { name: "Personaje", value: clean(application.answers.character) },
            { name: "RDM y VDM", value: clean(application.answers.concepts) },
            { name: "Valoración de vida", value: clean(application.answers.life) },
            { name: "Conflicto de rol", value: clean(application.answers.role) },
            { name: "Motivación", value: clean(application.answers.motivation) }
        )
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: "La decisión final pertenece al staff." })
        .setTimestamp();
}

async function handleApplication(interaction) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (member.roles.cache.has(WHITELIST_ROLE_ID)) {
        return interaction.reply({ content: "✅ Ya tienes la whitelist de Legado Roleplay.", flags: MessageFlags.Ephemeral });
    }

    const pending = db.prepare(`
        SELECT id FROM whitelist_applications
        WHERE guildId = ? AND userId = ? AND status = 'pending'
        ORDER BY id DESC LIMIT 1
    `).get(interaction.guild.id, interaction.user.id);

    if (pending) {
        return interaction.reply({ content: `⏳ Ya tienes la solicitud #${pending.id} esperando revisión.`, flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const answers = {
        character: interaction.fields.getTextInputValue("wl_character"),
        concepts: interaction.fields.getTextInputValue("wl_concepts"),
        life: interaction.fields.getTextInputValue("wl_life"),
        role: interaction.fields.getTextInputValue("wl_role"),
        motivation: interaction.fields.getTextInputValue("wl_motivation")
    };

    const evaluation = manualEvaluation();

    const result = db.prepare(`
        INSERT INTO whitelist_applications
        (guildId, userId, answers, aiScore, aiRecommendation, aiSummary, aiStrengths, aiConcerns, status, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(
        interaction.guild.id,
        interaction.user.id,
        JSON.stringify(answers),
        evaluation.score,
        evaluation.recommendation,
        evaluation.summary,
        evaluation.strengths,
        evaluation.concerns,
        new Date().toISOString()
    );

    const application = { id: Number(result.lastInsertRowid), answers };
    const reviewChannel = await interaction.guild.channels.fetch(REVIEW_CHANNEL_ID).catch(() => null);
    if (!reviewChannel?.isTextBased()) {
        db.prepare("UPDATE whitelist_applications SET status = 'delivery_error' WHERE id = ?").run(application.id);
        return interaction.editReply("❌ No pude encontrar el canal de revisión. Comunícate con un administrador.");
    }

    const reviewMessage = await reviewChannel.send({
        embeds: [resultEmbed(application, interaction.user, evaluation)],
        components: [decisionButtons(application.id)]
    });

    db.prepare("UPDATE whitelist_applications SET reviewMessageId = ? WHERE id = ?")
        .run(reviewMessage.id, application.id);

    await interaction.editReply(`💙 Tu solicitud #${application.id} fue enviada correctamente. El staff te notificará su decisión.`);
}

async function handleDecision(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
        return interaction.reply({ content: "❌ No tienes permiso para revisar solicitudes.", flags: MessageFlags.Ephemeral });
    }

    const [action, rawId] = interaction.customId.split(":");
    const applicationId = Number(rawId);
    const application = db.prepare("SELECT * FROM whitelist_applications WHERE id = ? AND guildId = ?")
        .get(applicationId, interaction.guild.id);

    if (!application || application.status !== "pending") {
        return interaction.reply({ content: "⚠️ Esta solicitud ya fue revisada o no existe.", flags: MessageFlags.Ephemeral });
    }

    await interaction.deferUpdate();
    const applicant = await interaction.guild.members.fetch(application.userId).catch(() => null);
    let status;
    let decisionText;
    let dmText;

    if (action === "wl_approve") {
        if (!applicant) throw new Error("El usuario ya no está en el servidor.");
        await applicant.roles.add(WHITELIST_ROLE_ID, `Whitelist aprobada por ${interaction.user.tag}`);
        status = "approved";
        decisionText = `✅ Aprobada por ${interaction.user}`;
        dmText = "💙 ¡Tu whitelist de Legado Roleplay fue aprobada! Ya tienes acceso al servidor.";
    } else if (action === "wl_reject") {
        status = "rejected";
        decisionText = `❌ Rechazada por ${interaction.user}`;
        dmText = "❌ Tu solicitud de whitelist de Legado Roleplay fue rechazada. Puedes comunicarte con el staff para recibir orientación.";
    } else {
        status = "repeat";
        decisionText = `🔄 Se permitió repetir por ${interaction.user}`;
        dmText = "🔄 El staff de Legado Roleplay te permitió realizar nuevamente la entrevista con `/whitelist`.";
    }

    db.prepare(`
        UPDATE whitelist_applications
        SET status = ?, reviewedBy = ?, reviewedAt = ?
        WHERE id = ?
    `).run(status, interaction.user.id, new Date().toISOString(), applicationId);

    const oldEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(status === "approved" ? 0x57F287 : status === "rejected" ? 0xED4245 : 0xFEE75C)
        .addFields({ name: "Decisión final", value: decisionText });

    await interaction.editReply({ embeds: [oldEmbed], components: [decisionButtons(applicationId, true)] });
    if (applicant) await applicant.send(dmText).catch(() => null);
}

module.exports = {
    name: "interactionCreate",
    async execute(interaction) {
        try {
            if (interaction.isButton() && interaction.customId === "wl_start") {
                const member = await interaction.guild.members.fetch(interaction.user.id);

                if (member.roles.cache.has(WHITELIST_ROLE_ID)) {
                    return interaction.reply({
                        content: "✅ Ya tienes la whitelist de Legado Roleplay.",
                        flags: MessageFlags.Ephemeral
                    });
                }

                const pending = db.prepare(`
                    SELECT id FROM whitelist_applications
                    WHERE guildId = ? AND userId = ? AND status = 'pending'
                    ORDER BY id DESC LIMIT 1
                `).get(interaction.guild.id, interaction.user.id);

                if (pending) {
                    return interaction.reply({
                        content: `⏳ Ya tienes la solicitud #${pending.id} esperando revisión del staff.`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                return await interaction.showModal(buildWhitelistModal());
            }

            if (interaction.isModalSubmit() && interaction.customId === "wl_application") {
                return await handleApplication(interaction);
            }

            if (interaction.isButton() && /^wl_(approve|reject|repeat):\d+$/.test(interaction.customId)) {
                return await handleDecision(interaction);
            }
        } catch (error) {
            console.error("[WHITELIST ERROR]", error);
            const payload = { content: `❌ No se pudo completar la acción: ${clean(error.message, 160)}`, flags: MessageFlags.Ephemeral };
            if (interaction.deferred || interaction.replied) await interaction.followUp(payload).catch(() => null);
            else await interaction.reply(payload).catch(() => null);
        }
    }
};
