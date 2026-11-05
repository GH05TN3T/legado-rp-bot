const automod = require("../automod");
const streamNotification = require("../moderation/streamNotification");
const countingGame = require("../moderation/countingGame");
const wordChainGame = require("../moderation/wordChainGame");

// IDs de los canales donde solo se permiten imágenes/videos
const mediaChannels = [
    "1322782246117179452",
    "1322782324932346039"
];

// Roles que no pueden ser mencionados
const protectedRoles = [
    "1410181325498880092"
];

// Usuarios que no pueden ser mencionados directamente
const protectedUsers = [
    "1388456779507306536",
    "777634428260188160"
];

// Roles que sí pueden mencionar los roles y usuarios protegidos
const allowedMentionRoles = [
    "1324969538516684892"
];

// Detecta enlaces válidos de Spotify
function isSpotifyLink(url) {
    try {
        const parsed = new URL(url);

        return (
            parsed.hostname === "open.spotify.com" ||
            parsed.hostname === "spotify.com" ||
            parsed.hostname.endsWith(".spotify.com")
        );
    } catch {
        return false;
    }
}

function canMentionProtected(message) {
    if (!message.member) return false;

    // Los administradores sí pueden mencionar
    if (message.member.permissions.has("Administrator")) {
        return true;
    }

    // Los roles permitidos también pueden mencionar
    return message.member.roles.cache.some(role =>
        allowedMentionRoles.includes(role.id)
    );
}

async function sendMentionWarning(message, text) {
    await message.delete().catch(() => {});

    const warning = await message.channel.send({
        content: `⚠️ ${message.author}, ${text}`
    }).catch(() => null);

    if (warning) {
        setTimeout(() => {
            warning.delete().catch(() => {});
        }, 5000);
    }

    return true;
}

async function blockProtectedMention(message) {
    if (!message.guild || !message.member) return false;

    // Evita que el bot bloquee al propio usuario protegido
    if (protectedUsers.includes(message.author.id)) {
        return false;
    }

    if (canMentionProtected(message)) {
        return false;
    }

    const protectedRoleMentioned = protectedRoles.some(roleId =>
        message.mentions.roles.has(roleId) ||
        message.content.includes(`<@&${roleId}>`)
    );

    if (protectedRoleMentioned) {
        return sendMentionWarning(
            message,
            "no tienes permitido mencionar ese rol."
        );
    }

    const protectedUserMentioned = protectedUsers.some(userId =>
        message.mentions.users.has(userId) ||
        message.content.includes(`<@${userId}>`) ||
        message.content.includes(`<@!${userId}>`)
    );

    if (protectedUserMentioned) {
        return sendMentionWarning(
            message,
            "no tienes permitido mencionar a ese usuario."
        );
    }

    return false;
}

function hasValidMedia(message) {
    if (message.attachments.size === 0) return false;

    return [...message.attachments.values()].every(file => {
        const contentType = file.contentType || "";

        return (
            contentType.startsWith("image/") ||
            contentType.startsWith("video/")
        );
    });
}

function hasOnlyAllowedLinks(content) {
    if (!content.trim()) return true;

    const links = content.match(/https?:\/\/[^\s]+/gi) || [];

    // Si hay links, todos tienen que ser de Spotify
    for (const link of links) {
        const cleanLink = link.replace(/[),.!]+$/, "");

        if (!isSpotifyLink(cleanLink)) {
            return false;
        }
    }

    return true;
}

module.exports = {
    name: "messageCreate",

    async execute(message) {
        try {
            if (message.author.bot) return;
            if (!message.guild) return;

            // El canal del contador solo acepta la secuencia del minijuego.
            if (await countingGame(message)) return;
            if (await wordChainGame(message)) return;

            // Bloquea menciones de roles y usuarios protegidos
            if (await blockProtectedMention(message)) return;

            // Notificaciones de Stream
            const streamHandled = await streamNotification(message);

            if (streamHandled) return;

            // ==========================================
            // CANALES DE FOTOS Y VIDEOS
            // ==========================================

            if (mediaChannels.includes(message.channel.id)) {
                const validMedia = hasValidMedia(message);
                const validLinks = hasOnlyAllowedLinks(message.content);

                // Tiene que existir obligatoriamente una foto o video
                if (!validMedia) {
                    await message.delete().catch(() => {});

                    const warn = await message.channel.send({
                        content:
                            `⚠️ ${message.author}, en este canal debes subir una **imagen o video**. ` +
                            `Puedes acompañarlo con un enlace de **Spotify**.`
                    }).catch(() => null);

                    if (warn) {
                        setTimeout(() => {
                            warn.delete().catch(() => {});
                        }, 5000);
                    }

                    return;
                }

                // Si contiene un link que no sea Spotify
                if (!validLinks) {
                    await message.delete().catch(() => {});

                    const warn = await message.channel.send({
                        content:
                            `⚠️ ${message.author}, junto a la imagen o video ` +
                            `solo se permiten enlaces de **Spotify**.`
                    }).catch(() => null);

                    if (warn) {
                        setTimeout(() => {
                            warn.delete().catch(() => {});
                        }, 5000);
                    }

                    return;
                }

                return;
            }

            // AutoMod para los demás canales
            await automod(message);

        } catch (error) {
            console.error("❌ Error en messageCreate:", error);
        }
    }
};
