const logger = require("../logger");
module.exports = { name: "roleDelete", async execute(role) {
    await logger.sendLog(role.guild, { type: "roles", title: "🗑️ Rol eliminado", color: 0xED4245, fields: [
        { name: "Nombre", value: role.name, inline: true }, { name: "ID", value: role.id, inline: true }
    ]});
}};
