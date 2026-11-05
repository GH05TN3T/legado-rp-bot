const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder
} = require("discord.js");
const path = require("path");
const { sendLog } = require("../logger");

// =============================
// CONFIGURACIÓN
// =============================

// Canal donde los usuarios enviarán sus enlaces de stream
const STREAM_CHANNEL_ID = "1322780752202432574";

// Rol necesario para publicar streams
const STREAMER_ROLE_ID = "1334303244230328391";

// Canal donde se publicará el embed.
// Puedes colocar el mismo ID del canal anterior.
const STREAM_ANNOUNCEMENT_CHANNEL_ID = "1322780752202432574";

// Rol que será mencionado.
// Déjalo vacío "" para no mencionar ningún rol.
const STREAM_PING_ROLE_ID = "1323178557106557018";

const STREAM_BANNER = path.join(__dirname, "..", "assets", "legado-banner.png");

// Eliminar el mensaje original del usuario
const DELETE_ORIGINAL_MESSAGE = true;

// Tiempo de espera antes de volver a publicar otro stream.
// Actualmente: 30 minutos.
const COOLDOWN_TIME = 1 * 60 * 1000; 

const cooldowns = new Map();

const PLATFORMS = [
    {
        name: "Twitch",
        emoji: "🟣",
        color: 0x9146ff,
        domains: ["twitch.tv", "www.twitch.tv"]
    },
    {
        name: "Kick",
        emoji: "🟢",
        color: 0x53fc18,
        domains: ["kick.com", "www.kick.com"]
    },
    {
        name: "YouTube",
        emoji: "🔴",
        color: 0xff0000,
        domains: [
            "youtube.com",
            "www.youtube.com",
            "youtu.be",
            "www.youtu.be"
        ]
    },
    {
        name: "Facebook Gaming",
        emoji: "🔵",
        color: 0x1877f2,
        domains: [
            "facebook.com",
            "www.facebook.com",
            "fb.gg",
            "www.fb.gg"
        ]
    },
    {
        name: "TikTok",
        emoji: "🎵",
        color: 0x010101,
        domains: ["tiktok.com", "www.tiktok.com"]
    }
];

function findStreamLink(content) {
    const links = content.match(/https?:\/\/[^\s<]+/gi);

    if (!links) return null;

    for (const link of links) {
        try {
            const url = new URL(link);
            const hostname = url.hostname.toLowerCase();

            const platform = PLATFORMS.find((item) =>
                item.domains.includes(hostname)
            );

            if (platform) {
                return {
                    url: url.toString(),
                    platform
                };
            }
        } catch {
            continue;
        }
    }

    return null;
}

async function streamNotification(message) {
    if (!message.guild) return false;
    if (!message.author) return false;
    if (message.author.bot) return false;

    // Solo detectar enlaces en el canal configurado
    if (message.channel.id !== STREAM_CHANNEL_ID) {
        return false;
    }

    const streamData = findStreamLink(message.content);

    // No es un enlace compatible
    if (!streamData) {
        return false;
    }

    // Verificar rol de streamer
    if (
        STREAMER_ROLE_ID &&
        !message.member.roles.cache.has(STREAMER_ROLE_ID)
    ) {
        await sendLog(message.guild, {
            type: "streamers",
            title: "⛔ Publicación de stream rechazada",
            color: 0xED4245,
            user: message.author,
            fields: [
                { name: "Usuario", value: `${message.author} (${message.author.id})` },
                { name: "Motivo", value: "No tiene el rol de Streamer" },
                { name: "Plataforma", value: streamData.platform.name, inline: true },
                { name: "Canal", value: `${message.channel}`, inline: true }
            ]
        });

        await message.reply({
            content:
                "❌ Necesitas el rol de **Streamer** para publicar enlaces de directos.",
            allowedMentions: {
                repliedUser: false
            }
        }).then((reply) => {
            setTimeout(() => {
                reply.delete().catch(() => {});
            }, 7000);
        });

        return true;
    }

    // Verificar cooldown
    const cooldownKey = `${message.guild.id}-${message.author.id}`;
    const lastNotification = cooldowns.get(cooldownKey);
    const now = Date.now();

    if (
        lastNotification &&
        now - lastNotification < COOLDOWN_TIME
    ) {
        const remainingTime =
            COOLDOWN_TIME - (now - lastNotification);

        const remainingMinutes = Math.ceil(
            remainingTime / 60000
        );

        await message.reply({
            content:
                `⏳ Debes esperar **${remainingMinutes} minutos** antes de publicar otro stream.`,
            allowedMentions: {
                repliedUser: false
            }
        }).then((reply) => {
            setTimeout(() => {
                reply.delete().catch(() => {});
            }, 7000);
        });

        return true;
    }

    const announcementChannel =
        message.guild.channels.cache.get(
            STREAM_ANNOUNCEMENT_CHANNEL_ID
        );

    if (!announcementChannel?.isTextBased()) {
        console.error(
            "[STREAMS] El canal de anuncios no existe o no es válido."
        );

        await sendLog(message.guild, {
            type: "streamers",
            title: "❌ Error en notificación de stream",
            color: 0xED4245,
            user: message.author,
            description: "El canal de anuncios configurado no existe o no es válido.",
            fields: [
                { name: "Plataforma", value: streamData.platform.name, inline: true },
                { name: "Streamer", value: `${message.author}`, inline: true }
            ]
        });

        return true;
    }

    const memberName =
        message.member?.displayName ||
        message.author.username;

    const platform = streamData.platform;
    const timestamp = Math.floor(Date.now() / 1000);

    const embed = new EmbedBuilder()
        .setColor(platform.color)
        .setAuthor({
            name: "LEGADO ROLEPLAY • STREAMERS",
            iconURL:
                message.guild.iconURL({
                    dynamic: true
                }) || undefined
        })
        .setTitle(
            `${platform.emoji} ${memberName} está en directo`
        )
        .setURL(streamData.url)
        .setDescription(
            [
                `## 🔴 STREAM EN VIVO`,
                "",
                `🎮 **${message.author} acaba de iniciar un directo.**`,
                "",
                `> Entra al stream y apoya dejando tu follow, comentario y compartiendo el directo.`,
                "",
                `**Plataforma:** ${platform.name}`,
                `**Streamer:** ${message.author}`,
                `**Publicado:** <t:${timestamp}:R>`,
                "",
                `### 🌐 Legado Roleplay`,
                `No solo somos un servidor, somos una familia.`
            ].join("\n")
        )
        .setThumbnail(
            message.author.displayAvatarURL({
                dynamic: true,
                size: 1024
            })
        )
        .setFooter({
            text: `Legado Roleplay • ${platform.name}`,
            iconURL:
                message.guild.iconURL({
                    dynamic: true
                }) || undefined
        })
        .setTimestamp();

    embed.setImage("attachment://legado-stream.png");

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel("Ver stream")
            .setEmoji("📺")
            .setStyle(ButtonStyle.Link)
            .setURL(streamData.url),

        new ButtonBuilder()
            .setLabel("Conectar a Legado Roleplay")
            .setEmoji("🎮")
            .setStyle(ButtonStyle.Link)
            .setURL("https://cfx.re/join/bagxgl")
    );

    let mentionContent = "";

    if (STREAM_PING_ROLE_ID) {
        mentionContent = `<@&${STREAM_PING_ROLE_ID}>`;
    }

    try {
        await announcementChannel.send({
            content: mentionContent || undefined,
            embeds: [embed],
            components: [buttons],
            files: [new AttachmentBuilder(STREAM_BANNER, { name: "legado-stream.png" })],
            allowedMentions: {
                roles: STREAM_PING_ROLE_ID
                    ? [STREAM_PING_ROLE_ID]
                    : []
            }
        });

        cooldowns.set(cooldownKey, now);

        await sendLog(message.guild, {
            type: "streamers",
            title: "📺 Stream publicado",
            color: platform.color,
            user: message.author,
            fields: [
                { name: "Streamer", value: `${message.author} (${message.author.id})` },
                { name: "Plataforma", value: platform.name, inline: true },
                { name: "Canal", value: `${announcementChannel}`, inline: true },
                { name: "Enlace", value: streamData.url }
            ]
        });

        if (
            DELETE_ORIGINAL_MESSAGE &&
            message.deletable
        ) {
            await message.delete().catch(() => {});
        }

        return true;
    } catch (error) {
        console.error(
            "[STREAMS] Error publicando el stream:",
            error
        );

        await sendLog(message.guild, {
            type: "streamers",
            title: "❌ Error publicando stream",
            color: 0xED4245,
            user: message.author,
            description: `No se pudo publicar la notificación: ${error.message || "Error desconocido"}`,
            fields: [
                { name: "Plataforma", value: streamData.platform.name, inline: true },
                { name: "Enlace", value: streamData.url }
            ]
        });

        return true;
    }
}

module.exports = streamNotification;
