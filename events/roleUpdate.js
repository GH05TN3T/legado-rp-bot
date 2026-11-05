const logger = require("../logger");
module.exports = { name: "roleUpdate", async execute(oldRole, newRole) {
    const changes = [];
    if (oldRole.name !== newRole.name) changes.push({ name: "Nombre", value: `${oldRole.name} → ${newRole.name}` });
    if (oldRole.color !== newRole.color) changes.push({ name: "Color", value: `${oldRole.hexColor} → ${newRole.hexColor}` });
    if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes.push({ name: "Permisos", value: "Los permisos del rol fueron modificados." });
    if (!changes.length) return;
    await logger.sendLog(newRole.guild, { type: "roles", title: "⚙️ Rol actualizado", color: 0xFEE75C, fields: [
        { name: "Rol", value: `${newRole}`, inline: true }, { name: "ID", value: newRole.id, inline: true }, ...changes
    ]});
}};
