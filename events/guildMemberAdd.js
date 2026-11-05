const logger = require("../logger");

module.exports = {
    name: "guildMemberAdd",

    async execute(member) {
        await logger.sendLog(member.guild, { type: "members",
            title: "📥 Usuario entró al servidor",
            color: 0x57F287,
            user: member.user,
            fields: [
                { name: "👤 Usuario", value: `${member.user} (${member.user.tag})`, inline: true },
                { name: "🆔 ID", value: member.id, inline: true },
                { name: "📅 Cuenta creada", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>` },
                { name: "👥 Miembros", value: `${member.guild.memberCount}`, inline: true }
            ]
        });
    }
};
