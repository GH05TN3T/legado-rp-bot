const logger = require("../logger");
module.exports = { name: "channelUpdate", async execute(oldChannel, newChannel) {
    if (!newChannel.guild) return;
    const changes = [];
    if (oldChannel.name !== newChannel.name) changes.push({ name: "Nombre", value: `${oldChannel.name} → ${newChannel.name}` });
    if ("topic" in oldChannel && oldChannel.topic !== newChannel.topic) changes.push({ name: "Tema", value: `${oldChannel.topic || "Sin tema"} → ${newChannel.topic || "Sin tema"}`.slice(0, 1024) });
    if (oldChannel.parentId !== newChannel.parentId) changes.push({ name: "Categoría", value: `${oldChannel.parent?.name || "Ninguna"} → ${newChannel.parent?.name || "Ninguna"}` });
    if (!changes.length) return;
    await logger.sendLog(newChannel.guild, { type: "channels", title: "⚙️ Canal actualizado", color: 0xFEE75C, fields: [
        { name: "Canal", value: `${newChannel}`, inline: true }, { name: "ID", value: newChannel.id, inline: true }, ...changes
    ]});
}};
