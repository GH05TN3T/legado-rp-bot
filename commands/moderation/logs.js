const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");

const db = require("../../database");

const CATEGORIES = [
    ["📋 General", "logsChannel"],
    ["💬 Mensajes", "logsMessagesChannel"],
    ["👥 Miembros", "logsMembersChannel"],
    ["🛡️ Moderación", "logsModerationChannel"],
    ["🎭 Roles", "logsRolesChannel"],
    ["📂 Canales", "logsChannelsChannel"],
    ["🎙️ Voz", "logsVoiceChannel"],
    ["⌨️ Comandos", "logsCommandsChannel"],
    ["💰 Pagos", "logsPaymentsChannel"],
    ["📺 Streamers", "logsStreamersChannel"],
    ["✅ Verificaciones", "logsVerificationChannel"]
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("logs")
        .setDescription("Muestra los canales configurados para cada categoría de logs.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const config = db.prepare(
            "SELECT * FROM config WHERE guildId = ?"
        ).get(interaction.guild.id) || {};

        const generalId = config.logsChannel;
        const description = CATEGORIES.map(([label, column]) => {
            const ownId = config[column];

            if (ownId) {
                return `${label} → <#${ownId}>`;
            }

            if (column !== "logsChannel" && generalId) {
                return `${label} → <#${generalId}> *(respaldo general)*`;
            }

            return `${label} → ❌ No configurado`;
        }).join("\n");

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("📋 Configuración de logs")
            .setDescription(description)
            .setFooter({ text: "Usa /setlogs para cambiar cualquier categoría" })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
