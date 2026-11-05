const path = require("path");
const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    AttachmentBuilder,
    MessageFlags,
    ChannelType
} = require("discord.js");
const db = require("../../database");

const BLUE = 0x48bff7;
const LOGO_PATH = path.join(__dirname, "..", "..", "assets", "legado-logo.png");
const BANNER_PATH = path.join(__dirname, "..", "..", "assets", "legado-banner.png");

const DEFAULT_SANCTIONS = [
    ["Car kill", "100 CM"],
    ["Volver al rol antes de los 20 minutos", "250 CM"],
    ["Matar sin rol previo", "200 CM"],
    ["Robar vehículos en zona segura", "150 CM"],
    ["Acoso o racismo", "150/200 CM"],
    ["Forzar o evadir rol", "150/200 CM"],
    ["Realizar actos delictivos sin policías en servicio", "150 CM"],
    ["Robar cualquier tipo de vehículo gubernamental", "150 CM"],
    ["Abuso de bugs de animaciones en rol agresivo", "250 CM"],
    ["Hablar estando muerto", "150 CM"],
    ["Meta gaming", "200 CM"],
    ["No valorar la vida", "250 CM"],
    ["Evasión o invasión de rol", "200 CM"],
    ["Hablar OOC", "150 CM"],
    ["Quitar algún artículo médico o policial", "200 CM"],
    ["Antirol", "200 CM"],
    ["Portar armamento sin representar", "250 CM"],
    ["No respetar el rol de entorno", "300 CM"],
    ["No tener clip en un rol agresivo", "300 CM"],
    ["Ser cómplice de MENU", "Ban permanente"]
];

const NOTES = [
    "🚫 Aplicar el típico F8 para evadir algún tipo de rol será gravemente sancionado con **400 CM o 3 días de ban**, acumulando strikes hasta que sea permanente.",
    "🚫 Mentir u ocultar pruebas al equipo de staff puede ser gravemente sancionado con **48 horas de ban**. El mal comportamiento en la sala de soporte conlleva una sanción de **3 a 5 días sin apelación**."
];

function seedSanctions(guildId, force = false) {
    const count = db.prepare("SELECT COUNT(*) AS total FROM sanctions WHERE guildId = ?").get(guildId).total;
    if (count && !force) return false;

    const insert = db.prepare("INSERT INTO sanctions (guildId, position, rule, penalty) VALUES (?, ?, ?, ?)");
    db.transaction(() => {
        if (force) db.prepare("DELETE FROM sanctions WHERE guildId = ?").run(guildId);
        DEFAULT_SANCTIONS.forEach(([rule, penalty], index) => insert.run(guildId, index + 1, rule, penalty));
    })();
    return true;
}

function getSanctions(guildId) {
    seedSanctions(guildId);
    return db.prepare("SELECT id, position, rule, penalty FROM sanctions WHERE guildId = ? ORDER BY position").all(guildId);
}

function normalizePositions(guildId) {
    const rows = db.prepare("SELECT id FROM sanctions WHERE guildId = ? ORDER BY position, id").all(guildId);
    const update = db.prepare("UPDATE sanctions SET position = ? WHERE id = ?");
    db.transaction(() => {
        // Posiciones temporales evitan choques con el índice UNIQUE.
        rows.forEach((row, index) => update.run(-(index + 1), row.id));
        rows.forEach((row, index) => update.run(index + 1, row.id));
    })();
}

function buildEmbed(guildId) {
    const rows = getSanctions(guildId);
    const list = rows.map((item, index) => `🔹 **${index + 1}. ${item.rule}** — ${item.penalty}`).join("\n");
    return new EmbedBuilder()
        .setColor(BLUE)
        .setAuthor({ name: "Legado Roleplay", iconURL: "attachment://legado-logo.png" })
        .setTitle("LISTA DE SANCIONES | Legado Roleplay")
        .setDescription(`${list}\n\n${NOTES.join("\n\n")}`)
        .setThumbnail("attachment://legado-logo.png")
        .setImage("attachment://legado-banner.png")
        .setFooter({ text: "Legado Roleplay • Reglamento de sanciones" })
        .setTimestamp();
}

function files() {
    return [
        new AttachmentBuilder(LOGO_PATH, { name: "legado-logo.png" }),
        new AttachmentBuilder(BANNER_PATH, { name: "legado-banner.png" })
    ];
}

async function refreshBoard(guild) {
    const saved = db.prepare("SELECT channelId, messageId FROM sanctions_board WHERE guildId = ?").get(guild.id);
    if (!saved) return { updated: false, reason: "La tabla todavía no ha sido publicada." };

    try {
        const channel = await guild.channels.fetch(saved.channelId);
        if (!channel?.isTextBased()) throw new Error("Canal no disponible");
        const message = await channel.messages.fetch(saved.messageId);
        await message.edit({ embeds: [buildEmbed(guild.id)], attachments: [], files: files() });
        return { updated: true, message };
    } catch (error) {
        console.error("[SANCIONES REFRESH]", error);
        return { updated: false, reason: "Se guardó el cambio, pero el mensaje publicado ya no existe. Usa `/sanciones publicar`." };
    }
}

async function reply(interaction, content) {
    return interaction.reply({ content, flags: MessageFlags.Ephemeral });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sanciones")
        .setDescription("Gestiona la tabla de sanciones de Legado Roleplay")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => sub
            .setName("publicar")
            .setDescription("Publica o mueve la tabla de sanciones")
            .addChannelOption(option => option
                .setName("canal")
                .setDescription("Canal donde se publicará")
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(false)))
        .addSubcommand(sub => sub.setName("listar").setDescription("Muestra la lista numerada para administrarla"))
        .addSubcommand(sub => sub
            .setName("agregar")
            .setDescription("Agrega una sanción")
            .addStringOption(o => o.setName("regla").setDescription("Nombre de la infracción").setRequired(true).setMaxLength(150))
            .addStringOption(o => o.setName("castigo").setDescription("Ejemplo: 250 CM o Ban permanente").setRequired(true).setMaxLength(80))
            .addIntegerOption(o => o.setName("posicion").setDescription("Lugar en la lista").setMinValue(1)))
        .addSubcommand(sub => sub
            .setName("editar")
            .setDescription("Edita una sanción por su número")
            .addIntegerOption(o => o.setName("numero").setDescription("Número mostrado en /sanciones listar").setRequired(true).setMinValue(1))
            .addStringOption(o => o.setName("regla").setDescription("Nuevo nombre de la infracción").setMaxLength(150))
            .addStringOption(o => o.setName("castigo").setDescription("Nuevo castigo").setMaxLength(80)))
        .addSubcommand(sub => sub
            .setName("eliminar")
            .setDescription("Elimina una sanción por su número")
            .addIntegerOption(o => o.setName("numero").setDescription("Número mostrado en /sanciones listar").setRequired(true).setMinValue(1)))
        .addSubcommand(sub => sub
            .setName("mover")
            .setDescription("Cambia una sanción de posición")
            .addIntegerOption(o => o.setName("numero").setDescription("Número actual").setRequired(true).setMinValue(1))
            .addIntegerOption(o => o.setName("posicion").setDescription("Nueva posición").setRequired(true).setMinValue(1)))
        .addSubcommand(sub => sub
            .setName("restaurar")
            .setDescription("Restaura todas las sanciones originales de la imagen")
            .addBooleanOption(o => o.setName("confirmar").setDescription("Confirma que deseas reemplazar la lista actual").setRequired(true))),

    async execute(interaction) {
        if (!interaction.inGuild()) return reply(interaction, "❌ Este comando solo funciona dentro de un servidor.");
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return reply(interaction, "❌ Solo los administradores pueden gestionar las sanciones.");
        }

        const guildId = interaction.guildId;
        const action = interaction.options.getSubcommand();
        seedSanctions(guildId);

        if (action === "publicar") {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const channel = interaction.options.getChannel("canal") || interaction.channel;
            if (!channel?.isTextBased()) return interaction.editReply("❌ Selecciona un canal de texto válido.");

            const previous = db.prepare("SELECT channelId, messageId FROM sanctions_board WHERE guildId = ?").get(guildId);
            let message = null;
            if (previous && previous.channelId === channel.id) {
                try { message = await channel.messages.fetch(previous.messageId); } catch (_) { /* Crear uno nuevo. */ }
            }

            if (message) {
                await message.edit({ embeds: [buildEmbed(guildId)], attachments: [], files: files() });
            } else {
                message = await channel.send({ embeds: [buildEmbed(guildId)], files: files() });
            }

            db.prepare(`
                INSERT INTO sanctions_board (guildId, channelId, messageId, updatedAt)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(guildId) DO UPDATE SET
                    channelId = excluded.channelId,
                    messageId = excluded.messageId,
                    updatedAt = excluded.updatedAt
            `).run(guildId, channel.id, message.id, new Date().toISOString());
            return interaction.editReply(`✅ Tabla publicada y vinculada correctamente: ${message.url}`);
        }

        if (action === "listar") {
            const rows = getSanctions(guildId);
            const content = rows.map((row, i) => `**${i + 1}.** ${row.rule} — ${row.penalty}`).join("\n");
            return reply(interaction, `📋 **Sanciones actuales**\n\n${content}`);
        }

        if (action === "agregar") {
            const rows = getSanctions(guildId);
            const requested = interaction.options.getInteger("posicion") || rows.length + 1;
            const position = Math.min(requested, rows.length + 1);
            const rule = interaction.options.getString("regla", true).trim();
            const penalty = interaction.options.getString("castigo", true).trim();
            db.transaction(() => {
                db.prepare("UPDATE sanctions SET position = position + 1000 WHERE guildId = ? AND position >= ?").run(guildId, position);
                db.prepare("UPDATE sanctions SET position = position - 999 WHERE guildId = ? AND position >= ?").run(guildId, position + 1000);
                db.prepare("INSERT INTO sanctions (guildId, position, rule, penalty) VALUES (?, ?, ?, ?)").run(guildId, position, rule, penalty);
            })();
            normalizePositions(guildId);
            const status = await refreshBoard(interaction.guild);
            return reply(interaction, `✅ Sanción agregada en la posición ${position}.${status.updated ? " La tabla fue actualizada." : ` ${status.reason}`}`);
        }

        const number = interaction.options.getInteger("numero");
        const rows = getSanctions(guildId);
        const selected = number ? rows[number - 1] : null;

        if (action === "editar") {
            if (!selected) return reply(interaction, "❌ Ese número no existe. Usa `/sanciones listar`.");
            const rule = interaction.options.getString("regla")?.trim();
            const penalty = interaction.options.getString("castigo")?.trim();
            if (!rule && !penalty) return reply(interaction, "❌ Escribe una nueva regla, un nuevo castigo o ambos.");
            db.prepare("UPDATE sanctions SET rule = ?, penalty = ? WHERE id = ?").run(rule || selected.rule, penalty || selected.penalty, selected.id);
            const status = await refreshBoard(interaction.guild);
            return reply(interaction, `✅ Sanción ${number} editada.${status.updated ? " La tabla fue actualizada." : ` ${status.reason}`}`);
        }

        if (action === "eliminar") {
            if (!selected) return reply(interaction, "❌ Ese número no existe. Usa `/sanciones listar`.");
            db.prepare("DELETE FROM sanctions WHERE id = ?").run(selected.id);
            normalizePositions(guildId);
            const status = await refreshBoard(interaction.guild);
            return reply(interaction, `✅ Sanción ${number} eliminada.${status.updated ? " La tabla fue actualizada." : ` ${status.reason}`}`);
        }

        if (action === "mover") {
            if (!selected) return reply(interaction, "❌ Ese número no existe. Usa `/sanciones listar`.");
            const destination = Math.min(interaction.options.getInteger("posicion", true), rows.length);
            const orderedIds = rows.map(row => row.id);
            orderedIds.splice(number - 1, 1);
            orderedIds.splice(destination - 1, 0, selected.id);
            const update = db.prepare("UPDATE sanctions SET position = ? WHERE id = ?");
            db.transaction(() => {
                orderedIds.forEach((id, index) => update.run(-(index + 1), id));
                orderedIds.forEach((id, index) => update.run(index + 1, id));
            })();
            const status = await refreshBoard(interaction.guild);
            return reply(interaction, `✅ Sanción movida a la posición ${destination}.${status.updated ? " La tabla fue actualizada." : ` ${status.reason}`}`);
        }

        if (action === "restaurar") {
            if (!interaction.options.getBoolean("confirmar", true)) return reply(interaction, "❌ Restauración cancelada.");
            seedSanctions(guildId, true);
            const status = await refreshBoard(interaction.guild);
            return reply(interaction, `✅ Lista original restaurada.${status.updated ? " La tabla fue actualizada." : ` ${status.reason}`}`);
        }
    }
};
