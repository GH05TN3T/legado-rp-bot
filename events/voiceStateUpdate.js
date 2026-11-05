const config = require("../config");
const logger = require("../logger");
const voiceTime = require("../utils/voiceTime");

module.exports = {
    name: "voiceStateUpdate",

    async execute(oldState, newState) {
        const member = newState.member || oldState.member;
        if (!member || member.user.bot) return;

        const trackedRoleId = config.voiceTrackedRoleId;

        // Si no hay un rol configurado, no registra ni envía logs de Voice.
        if (!trackedRoleId || trackedRoleId === "PON_AQUI_EL_ID_DEL_ROL") {
            return;
        }

        // Solo detecta usuarios que tengan el rol configurado.
        const hasTrackedRole = member.roles.cache.has(trackedRoleId);

        if (!hasTrackedRole) {
            // Evita dejar una sesión abierta si al usuario le quitaron el rol
            // mientras estaba conectado a un canal de voz.
            voiceTime.cancelSession(member.guild.id, member.id);
            return;
        }

        // Entrada a Voice
        if (!oldState.channelId && newState.channelId) {
            const joinedAt = Date.now();
            voiceTime.startSession(member.guild.id, member.id, joinedAt);
            const joinedUnix = Math.floor(joinedAt / 1000);

            await logger.sendLog(member.guild, {
                type: "voice",
                title: "🔊 Entrada a canal de voz",
                color: 0x57F287,
                user: member.user,
                fields: [
                    { name: "Usuario", value: `${member.user}`, inline: true },
                    { name: "Canal", value: `${newState.channel}`, inline: true },
                    { name: "Rol detectado", value: `<@&${trackedRoleId}>`, inline: true },
                    { name: "Hora de entrada", value: `<t:${joinedUnix}:T>`, inline: true },
                    { name: "Fecha", value: `<t:${joinedUnix}:d>`, inline: true },
                    { name: "ID", value: member.id, inline: false }
                ]
            });

        // Salida de Voice
        } else if (oldState.channelId && !newState.channelId) {
            const leftAt = Date.now();
            const joinedAt = voiceTime.getSessionStart(member.guild.id, member.id);
            const sessionSeconds = voiceTime.endSession(member.guild.id, member.id, leftAt);
            const totalSeconds = voiceTime.getTotalSeconds(member.guild.id, member.id);
            const leftUnix = Math.floor(leftAt / 1000);
            const joinedUnix = joinedAt ? Math.floor(joinedAt / 1000) : null;

            await logger.sendLog(member.guild, {
                type: "voice",
                title: "🔇 Salida de canal de voz",
                color: 0xED4245,
                user: member.user,
                fields: [
                    { name: "Usuario", value: `${member.user}`, inline: true },
                    { name: "Canal", value: oldState.channel ? `${oldState.channel}` : "Desconocido", inline: true },
                    { name: "Rol detectado", value: `<@&${trackedRoleId}>`, inline: true },
                    { name: "Hora de entrada", value: joinedUnix ? `<t:${joinedUnix}:T>` : "No disponible", inline: true },
                    { name: "Hora de salida", value: `<t:${leftUnix}:T>`, inline: true },
                    { name: "Tiempo en Voice", value: voiceTime.formatDuration(sessionSeconds), inline: false },
                    { name: "Tiempo total acumulado", value: voiceTime.formatDuration(totalSeconds), inline: false },
                    { name: "ID", value: member.id, inline: false }
                ]
            });

        // Cambio entre canales de Voice
        } else if (oldState.channelId !== newState.channelId) {
            await logger.sendLog(member.guild, {
                type: "voice",
                title: "🔁 Cambio de canal de voz",
                color: 0x5865F2,
                user: member.user,
                fields: [
                    { name: "Usuario", value: `${member.user}` },
                    { name: "Antes", value: oldState.channel ? `${oldState.channel}` : "Desconocido", inline: true },
                    { name: "Después", value: newState.channel ? `${newState.channel}` : "Desconocido", inline: true },
                    { name: "Rol detectado", value: `<@&${trackedRoleId}>`, inline: false },
                    { name: "Tiempo total actual", value: voiceTime.formatDuration(voiceTime.getTotalSeconds(member.guild.id, member.id)), inline: false }
                ]
            });
        }

        // Cambios de mute/deafen del servidor para el rol seguido.
        if (oldState.serverMute !== newState.serverMute || oldState.serverDeaf !== newState.serverDeaf) {
            await logger.sendLog(member.guild, {
                type: "voice",
                title: "🎙️ Estado de voz modificado",
                color: 0xFEE75C,
                user: member.user,
                fields: [
                    { name: "Usuario", value: `${member.user}` },
                    { name: "Rol detectado", value: `<@&${trackedRoleId}>`, inline: false },
                    { name: "Silenciado por servidor", value: newState.serverMute ? "Sí" : "No", inline: true },
                    { name: "Ensordecido por servidor", value: newState.serverDeaf ? "Sí" : "No", inline: true }
                ]
            });
        }
    }
};
