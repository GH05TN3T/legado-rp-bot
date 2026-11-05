const logger = require("../logger");
module.exports = { name: "messageDeleteBulk", async execute(messages, channel) {
    const guild = channel.guild || messages.first()?.guild;
    if (!guild) return;
    await logger.sendLog(guild, { type: "messages", title: "🧹 Mensajes eliminados en masa", color: 0xED4245, fields: [
        { name: "Canal", value: `${channel}`, inline: true },
        { name: "Cantidad", value: `${messages.size}`, inline: true }
    ]});
}};
