const logger = require("../logger");

module.exports = {
    name: "guildBanRemove",

    async execute(ban) {
        await logger.sendLog(ban.guild, { type: "moderation",
            title: "✅ Usuario desbaneado",
            color: 0x57F287,
            user: ban.user,
            fields: [
                { name: "👤 Usuario", value: `${ban.user} (${ban.user.tag})`, inline: true },
                { name: "🆔 ID", value: ban.user.id, inline: true }
            ]
        });
    }
};
