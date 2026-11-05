const { EmbedBuilder } = require("discord.js");
const db = require("./database");

const LOG_COLUMNS = {
    general: "logsChannel",
    messages: "logsMessagesChannel",
    members: "logsMembersChannel",
    moderation: "logsModerationChannel",
    roles: "logsRolesChannel",
    channels: "logsChannelsChannel",
    voice: "logsVoiceChannel",
    dailyVoice: "logsDailyVoiceChannel",
    commands: "logsCommandsChannel",
    payments: "logsPaymentsChannel",
    streamers: "logsStreamersChannel",
    verification: "logsVerificationChannel"
};

async function sendLog(guild, options = {}) {
    if (!guild) return false;

    const config = db.prepare(
        "SELECT * FROM config WHERE guildId = ?"
    ).get(guild.id);

    if (!config) return false;

    const type = options.type || "general";
    const column = LOG_COLUMNS[type] || LOG_COLUMNS.general;
    const channelId = config[column] || config.logsChannel;

    if (!channelId) return false;

    let channel = guild.channels.cache.get(channelId);

    if (!channel) {
        channel = await guild.channels.fetch(channelId).catch(() => null);
    }

    if (!channel || !channel.isTextBased()) return false;

    const embed = new EmbedBuilder()
        .setColor(options.color || 0x5865F2)
        .setTitle(options.title || "Registro")
        .setTimestamp()
        .setFooter({
            text: `EXT-BOT • ${guild.name}`,
            iconURL: guild.iconURL({ dynamic: true }) || undefined
        });

    if (options.description) embed.setDescription(options.description);
    if (options.fields?.length) embed.addFields(options.fields);

    if (options.user?.displayAvatarURL) {
        embed.setThumbnail(options.user.displayAvatarURL({ dynamic: true }));
    } else if (options.thumbnail) {
        embed.setThumbnail(options.thumbnail);
    }

    if (options.image) embed.setImage(options.image);
    if (options.author) embed.setAuthor(options.author);

    try {
        await channel.send({ embeds: [embed] });
        return true;
    } catch (err) {
        console.error(`Error enviando log de tipo ${type}:`, err);
        return false;
    }
}

module.exports = { sendLog, LOG_COLUMNS };
