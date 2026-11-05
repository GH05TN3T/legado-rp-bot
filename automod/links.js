const config = require("../config/automod");
const { addWarning } = require("../utils/warnings");

// Roles que pueden enviar enlaces
const allowedLinkRoles = [
    "1324969538516684892"
];

// Detecta enlaces normales e invitaciones de Discord
const regex =
    /(https?:\/\/|www\.|discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)/i;

module.exports = async (message) => {
    if (!config.enabled) return false;

    if (!config.links.enabled) return false;

    if (message.author.bot) return false;

    if (!message.guild || !message.member) return false;

    // Permitir enlaces a usuarios con uno de los roles autorizados
    const hasAllowedLinkRole = message.member.roles.cache.some(role =>
        allowedLinkRoles.includes(role.id)
    );

    if (hasAllowedLinkRole) {
        return false;
    }

    // Solo bloquear enlaces en los canales configurados
    if (
        Array.isArray(config.links.channels) &&
        config.links.channels.length > 0 &&
        !config.links.channels.includes(message.channel.id)
    ) {
        return false;
    }

    if (!regex.test(message.content)) {
        return false;
    }

    const text = message.content.toLowerCase();

    const whitelist = Array.isArray(config.links.whitelist)
        ? config.links.whitelist
        : [];

    const allowed = whitelist.some(domain =>
        text.includes(domain.toLowerCase())
    );

    if (allowed) {
        return false;
    }

    await message.delete().catch(() => {});

    const warns = await addWarning(
        message.member,
        "Enlace no permitido"
    );

    console.log(
        `[AUTOMOD] Link bloqueado -> ${message.author.tag} (${warns} warns)`
    );

    return true;
};