const logger = require("../logger");
module.exports = { name: "roleCreate", async execute(role) {
    await logger.sendLog(role.guild, { type: "roles", title: "🎭 Rol creado", color: 0x57F287, fields: [
        { name: "Rol", value: `${role}`, inline: true }, { name: "Nombre", value: role.name, inline: true },
        { name: "ID", value: role.id, inline: true }
    ]});
}};
