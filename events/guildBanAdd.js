const logger = require("../logger");

module.exports = {
    name: "guildBanAdd",

    async execute(ban) {
        await logger.sendLog(ban.guild, { type: "moderation",
            title: "🔨 Usuario baneado",
            color: 0xED4245,
            user: ban.user,
            fields: [
                { name: "👤 Usuario", value: `${ban.user} (${ban.user.tag})`, inline: true },
                { name: "🆔 ID", value: ban.user.id, inline: true },
                { name: "📄 Razón", value: ban.reason || "No especificada" }
            ]
        });
    }
};
