const logger = require("../logger");

module.exports = {
    name: "guildMemberRemove",

    async execute(member) {
        await logger.sendLog(member.guild, { type: "members",
            title: "📤 Usuario salió del servidor",
            color: 0xED4245,
            user: member.user,
            fields: [
                { name: "👤 Usuario", value: `${member.user} (${member.user.tag})`, inline: true },
                { name: "🆔 ID", value: member.id, inline: true },
                { name: "📅 Se unió", value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : "Desconocido" },
                { name: "👥 Miembros", value: `${member.guild.memberCount}`, inline: true }
            ]
        });
    }
};
