const db = require("../database");
const config = require("../config/automod");
const log = require("./log");

async function addWarning(member, reason) {

    db.prepare(`
        INSERT INTO warnings
        (guildId,userId,moderatorId,reason,date)
        VALUES (?,?,?,?,datetime('now'))
    `).run(
        member.guild.id,
        member.id,
        member.client.user.id,
        reason
    );

    const total = db.prepare(`
        SELECT COUNT(*) total
        FROM warnings
        WHERE guildId=?
        AND userId=?
    `).get(
        member.guild.id,
        member.id
    ).total;

    // Enviar log de la advertencia
    await log(
        member.guild,
        "⚠️ Advertencia AutoMod",
        0xff9900,
        [
            {
                name: "👤 Usuario",
                value: `${member}`,
                inline: true
            },
            {
                name: "📄 Motivo",
                value: reason,
                inline: true
            },
            {
                name: "⚠️ Advertencias",
                value: String(total),
                inline: true
            }
        ]
    );

    if (total >= config.punishments.warnings) {

        await member.timeout(
            config.punishments.timeout * 60 * 1000,
            reason
        ).catch(() => {});

        // Log del timeout
        await log(
            member.guild,
            "🔨 Usuario Sancionado",
            0xff0000,
            [
                {
                    name: "👤 Usuario",
                    value: `${member}`,
                    inline: true
                },
                {
                    name: "📄 Motivo",
                    value: reason,
                    inline: true
                },
                {
                    name: "⏱️ Acción",
                    value: `Timeout (${config.punishments.timeout} minutos)`,
                    inline: true
                }
            ]
        );

        db.prepare(`
            DELETE FROM warnings
            WHERE guildId=?
            AND userId=?
        `).run(
            member.guild.id,
            member.id
        );

    }

    return total;

}

module.exports = {
    addWarning
};