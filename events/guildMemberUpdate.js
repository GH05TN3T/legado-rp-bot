const logger = require("../logger");
const path = require("path");
const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const config = require("../config");

const BOOST_BANNER = path.join(__dirname, "..", "assets", "legado-boost-blue.png");

async function sendBoostNotification(oldMember, newMember) {
    const startedBoosting = !oldMember.premiumSinceTimestamp && newMember.premiumSinceTimestamp;
    if (!startedBoosting) return;

    const channelId = config.boostChannelId;
    if (!channelId) {
        console.warn("No se envio la notificacion de boost: configura boostChannelId o BOOST_CHANNEL_ID.");
        return;
    }

    const channel = await newMember.guild.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) {
        console.warn(`No se encontro un canal de texto valido para boosts: ${channelId}`);
        return;
    }

    const boostCount = newMember.guild.premiumSubscriptionCount ?? 0;
    const avatar = newMember.user.displayAvatarURL({ size: 256 });
    const banner = new AttachmentBuilder(BOOST_BANNER, { name: "legado-boost-blue.png" });
    const embed = new EmbedBuilder()
        .setColor(0x168BFF)
        .setAuthor({
            name: `${newMember.user.globalName || newMember.user.username} mejoro el servidor!`,
            iconURL: avatar
        })
        .setTitle("¡Gracias por tu mejora! 🚀")
        .setDescription([
            `¡${newMember} ha **boosteado el servidor**! Ahora tenemos **${boostCount} ${boostCount === 1 ? "mejora" : "mejoras"}**.`,
            "",
            "≫ ¡Gracias por apoyar y contribuir al crecimiento de nuestra comunidad!"
        ].join("\n"))
        .setThumbnail(avatar)
        .setImage("attachment://legado-boost-blue.png")
        .setFooter({ text: "Legado Roleplay • República Dominicana y Latinoamérica" })
        .setTimestamp();

    await channel.send({
        content: `${newMember} 💖`,
        embeds: [embed],
        files: [banner],
        allowedMentions: { users: [newMember.id] }
    }).catch(error => console.error("Error enviando la notificacion de boost:", error));
}

module.exports = {
    name: "guildMemberUpdate",

    async execute(oldMember, newMember) {
        await sendBoostNotification(oldMember, newMember);

        const added = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
        const removed = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

        if (added.size || removed.size) {
            const fields = [
                { name: "👤 Usuario", value: `${newMember.user} (${newMember.user.tag})`, inline: true },
                { name: "🆔 ID", value: newMember.id, inline: true }
            ];

            if (added.size) fields.push({ name: "➕ Roles añadidos", value: added.map(role => `${role}`).join(", ").slice(0, 1024) });
            if (removed.size) fields.push({ name: "➖ Roles retirados", value: removed.map(role => `${role.name}`).join(", ").slice(0, 1024) });

            await logger.sendLog(newMember.guild, { type: "members",
                title: "🎭 Roles de usuario actualizados",
                color: 0x5865F2,
                user: newMember.user,
                fields
            });
        }

        if (oldMember.nickname !== newMember.nickname) {
            await logger.sendLog(newMember.guild, { type: "members",
                title: "📝 Apodo actualizado",
                color: 0xFEE75C,
                user: newMember.user,
                fields: [
                    { name: "👤 Usuario", value: `${newMember.user}`, inline: true },
                    { name: "Antes", value: oldMember.nickname || oldMember.user.username, inline: true },
                    { name: "Después", value: newMember.nickname || newMember.user.username, inline: true }
                ]
            });
        }

        const oldTimeout = oldMember.communicationDisabledUntilTimestamp || 0;
        const newTimeout = newMember.communicationDisabledUntilTimestamp || 0;
        if (oldTimeout !== newTimeout) {
            await logger.sendLog(newMember.guild, { type: "members",
                title: newTimeout ? "🔇 Usuario aislado" : "🔊 Aislamiento retirado",
                color: newTimeout ? 0xED4245 : 0x57F287,
                user: newMember.user,
                fields: [
                    { name: "👤 Usuario", value: `${newMember.user} (${newMember.user.tag})` },
                    { name: "Estado", value: newTimeout ? `Hasta <t:${Math.floor(newTimeout / 1000)}:F>` : "El usuario ya puede comunicarse" }
                ]
            });
        }
    }
};
