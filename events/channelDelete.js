const logger = require("../logger");
module.exports = { name: "channelDelete", async execute(channel) {
    if (!channel.guild) return;
    await logger.sendLog(channel.guild, { type: "channels", title: "🗑️ Canal eliminado", color: 0xED4245, fields: [
        { name: "Nombre", value: channel.name || "Desconocido", inline: true },
        { name: "ID", value: channel.id, inline: true }, { name: "Tipo", value: `${channel.type}`, inline: true }
    ]});
}};
