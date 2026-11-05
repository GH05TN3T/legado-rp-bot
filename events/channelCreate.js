const logger = require("../logger");
module.exports = { name: "channelCreate", async execute(channel) {
    if (!channel.guild) return;
    await logger.sendLog(channel.guild, { type: "channels", title: "📁 Canal creado", color: 0x57F287, fields: [
        { name: "Canal", value: `${channel}`, inline: true }, { name: "Nombre", value: channel.name, inline: true },
        { name: "ID", value: channel.id, inline: true }, { name: "Tipo", value: `${channel.type}`, inline: true }
    ]});
}};
