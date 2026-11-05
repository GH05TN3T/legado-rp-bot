const config = require("../config/automod");
const { addWarning } = require("../utils/warnings");

// Roles que pueden enviar invitaciones de Discord
const allowedInviteRoles = [
    "1324969538516684892"
];

const inviteRegex =
    /(discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)([a-zA-Z0-9-]+)/i;

module.exports = async (message) => {
    if (!config.enabled) return false;

    if (!config.invites.enabled) return false;

    if (message.author.bot) return false;

    if (!message.guild || !message.member) return false;

    // Permitir invitaciones a los roles autorizados
    const hasAllowedInviteRole = message.member.roles.cache.some(role =>
        allowedInviteRoles.includes(role.id)
    );

    if (hasAllowedInviteRole) {
        console.log(
            `[AUTOMOD] Invitación permitida por rol -> ${message.author.tag}`
        );

        return false;
    }

    const match = message.content.match(inviteRegex);

    if (!match) {
        return false;
    }

    const invite = match[0].toLowerCase();

    const whitelist = Array.isArray(config.invites.whitelist)
        ? config.invites.whitelist
        : [];

    const allowed = whitelist.some(link =>
        invite.includes(link.toLowerCase())
    );

    if (allowed) {
        return false;
    }

    await message.delete().catch(() => {});

    const warns = await addWarning(
        message.member,
        "Invitación de Discord"
    );

    console.log(
        `[AUTOMOD] Invitación bloqueada -> ${message.author.tag} (${warns} warns)`
    );

    return true;
};