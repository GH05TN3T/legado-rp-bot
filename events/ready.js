const { ActivityType } = require("discord.js");
const config = require("../config");
const voiceTime = require("../utils/voiceTime");
const logger = require("../logger");

module.exports = {

    name: "clientReady",

    once: true,

    async execute(client) {

        console.log(`✅ ${client.user.tag} conectado.`);

        // Al reiniciar, no contamos el tiempo que el bot estuvo apagado.
        // Solo iniciamos sesión para usuarios conectados que tengan el rol configurado.
        voiceTime.resetSessions();

        const trackedRoleId = config.voiceTrackedRoleId;

        if (trackedRoleId && trackedRoleId !== "PON_AQUI_EL_ID_DEL_ROL") {
            for (const guild of client.guilds.cache.values()) {
                try {
                    await guild.members.fetch();

                    for (const member of guild.members.cache.values()) {
                        if (
                            !member.user.bot &&
                            member.voice?.channelId &&
                            member.roles.cache.has(trackedRoleId)
                        ) {
                            voiceTime.startSession(guild.id, member.id);
                        }
                    }
                } catch (error) {
                    console.error(`Error sincronizando voice en ${guild.id}:`, error);
                }
            }
        } else {
            console.warn("⚠️ Voice Logs: configura VOICE_TRACKED_ROLE_ID para activar el seguimiento por rol.");
        }

        client.user.setPresence({
            activities: [
                {
                    name: "Legado Roleplay",
                    type: ActivityType.Playing
                }
            ],
            status: "online"
        });

        const goalSeconds = Number(config.dailyVoiceGoalSeconds) || 7200;

        async function checkDailyVoiceGoals() {
            try {
                const candidates = voiceTime.getDailyGoalCandidates(goalSeconds);

                for (const row of candidates) {
                    const guild = client.guilds.cache.get(row.guildId);
                    if (!guild) continue;

                    const member = await guild.members.fetch(row.userId).catch(() => null);
                    if (!member || member.user.bot) {
                        voiceTime.markDailyGoalNotified(row.guildId, row.userId, row.dateKey);
                        continue;
                    }

                    const sent = await logger.sendLog(guild, {
                        type: "dailyVoice",
                        title: "✅ Meta diaria de Voice completada",
                        color: 0x57F287,
                        user: member.user,
                        fields: [
                            { name: "Usuario", value: `${member.user}`, inline: true },
                            { name: "Meta", value: voiceTime.formatDuration(goalSeconds), inline: true },
                            { name: "Tiempo acumulado hoy", value: voiceTime.formatDuration(row.totalSeconds), inline: false },
                            { name: "Fecha (RD)", value: row.dateKey, inline: true },
                            { name: "ID", value: member.id, inline: true }
                        ]
                    });

                    if (sent) {
                        voiceTime.markDailyGoalNotified(row.guildId, row.userId, row.dateKey);
                    }
                }
            } catch (error) {
                console.error("Error comprobando metas diarias de Voice:", error);
            }
        }

        await checkDailyVoiceGoals();
        const dailyVoiceTimer = setInterval(checkDailyVoiceGoals, 60 * 1000);
        dailyVoiceTimer.unref();

    }

};
