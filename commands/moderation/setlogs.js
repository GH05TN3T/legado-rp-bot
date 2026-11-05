const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} = require("discord.js");

const db = require("../../database");

const TYPES = {
    general: { label: "General", column: "logsChannel" },
    messages: { label: "Mensajes", column: "logsMessagesChannel" },
    members: { label: "Miembros", column: "logsMembersChannel" },
    moderation: { label: "Moderación", column: "logsModerationChannel" },
    roles: { label: "Roles", column: "logsRolesChannel" },
    channels: { label: "Canales", column: "logsChannelsChannel" },
    voice: { label: "Voz", column: "logsVoiceChannel" },
    dailyVoice: { label: "Meta diaria de voz", column: "logsDailyVoiceChannel" },
    commands: { label: "Comandos", column: "logsCommandsChannel" },
    payments: { label: "Pagos", column: "logsPaymentsChannel" },
    streamers: { label: "Streamers", column: "logsStreamersChannel" },
    verification: { label: "Verificaciones", column: "logsVerificationChannel" }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setlogs")
        .setDescription("Configura un canal diferente para cada tipo de log.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option
                .setName("tipo")
                .setDescription("Tipo de log que quieres configurar")
                .setRequired(true)
                .addChoices(
                    { name: "General", value: "general" },
                    { name: "Mensajes", value: "messages" },
                    { name: "Miembros", value: "members" },
                    { name: "Moderación", value: "moderation" },
                    { name: "Roles", value: "roles" },
                    { name: "Canales", value: "channels" },
                    { name: "Voz", value: "voice" },
                    { name: "Meta diaria de voz (2 horas)", value: "dailyVoice" },
                    { name: "Comandos", value: "commands" },
                    { name: "Pagos", value: "payments" },
                    { name: "Streamers", value: "streamers" },
                    { name: "Verificaciones", value: "verification" }
                )
        )
        .addChannelOption(option =>
            option
                .setName("canal")
                .setDescription("Canal donde se enviará este tipo de log")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        ),

    async execute(interaction) {
        const type = interaction.options.getString("tipo", true);
        const channel = interaction.options.getChannel("canal", true);
        const selected = TYPES[type];

        if (!selected) {
            return interaction.reply({
                content: "❌ Tipo de log inválido.",
                ephemeral: true
            });
        }

        db.prepare(`
            INSERT INTO config(guildId, ${selected.column})
            VALUES(?, ?)
            ON CONFLICT(guildId)
            DO UPDATE SET ${selected.column} = excluded.${selected.column}
        `).run(interaction.guild.id, channel.id);

        await interaction.reply({
            content: `✅ Los logs de **${selected.label}** se enviarán a ${channel}.`,
            ephemeral: true
        });
    }
};
