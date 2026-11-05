const { EmbedBuilder } = require("discord.js");
const db = require("../database");

const getGame = db.prepare("SELECT * FROM counting_game WHERE guildId = ? AND enabled = 1");
const saveSuccess = db.transaction((guildId, userId, number) => {
    db.prepare(`
        UPDATE counting_game
        SET currentNumber = ?, lastUserId = ?, record = MAX(record, ?)
        WHERE guildId = ?
    `).run(number, userId, number, guildId);

    db.prepare(`
        INSERT INTO counting_scores (guildId, userId, correctNumbers, failures)
        VALUES (?, ?, 1, 0)
        ON CONFLICT(guildId, userId) DO UPDATE SET correctNumbers = correctNumbers + 1
    `).run(guildId, userId);
});

const saveFailure = db.transaction((guildId, userId) => {
    db.prepare(`
        UPDATE counting_game
        SET currentNumber = 0, lastUserId = NULL
        WHERE guildId = ?
    `).run(guildId);

    db.prepare(`
        INSERT INTO counting_scores (guildId, userId, correctNumbers, failures)
        VALUES (?, ?, 0, 1)
        ON CONFLICT(guildId, userId) DO UPDATE SET failures = failures + 1
    `).run(guildId, userId);
});

function parseNumber(content) {
    const clean = content.trim();
    if (!/^\d+$/.test(clean)) return null;

    const number = Number(clean);
    return Number.isSafeInteger(number) ? number : null;
}

function formatDuration(totalSeconds) {
    let remaining = totalSeconds;
    const days = Math.floor(remaining / 86400);
    remaining %= 86400;
    const hours = Math.floor(remaining / 3600);
    remaining %= 3600;
    const minutes = Math.floor(remaining / 60);
    const parts = [];

    if (days) parts.push(`${days} día${days === 1 ? "" : "s"}`);
    if (hours) parts.push(`${hours} hora${hours === 1 ? "" : "s"}`);
    if (minutes || parts.length === 0) {
        const shownMinutes = Math.max(1, minutes);
        parts.push(`${shownMinutes} minuto${shownMinutes === 1 ? "" : "s"}`);
    }
    return parts.join(" ");
}

function levelProgress(correctNumbers) {
    const perLevel = 100;
    const level = Math.floor(correctNumbers / perLevel) + 1;
    const progress = correctNumbers % perLevel;
    const filled = Math.floor(progress / 10);
    return {
        level,
        text: `\`${"█".repeat(filled)}${"░".repeat(10 - filled)}\`  **${progress} / ${perLevel}**`
    };
}

module.exports = async function countingGame(message) {
    const game = getGame.get(message.guild.id);
    if (!game || message.channel.id !== game.channelId) return false;

    const number = parseNumber(message.content);
    const expected = game.currentNumber + 1;
    const repeatedUser = game.lastUserId === message.author.id;
    const failed = number !== expected || repeatedUser;

    if (!failed) {
        saveSuccess(message.guild.id, message.author.id, number);
        // Emoji Unicode: funciona en cualquier servidor y no depende de que el
        // bot tenga acceso a un emoji personalizado de otro Discord.
        await message.react("✅").catch(error => {
            console.error("[CONTADOR REACTION ERROR]", error);
        });
        return true;
    }

    saveFailure(message.guild.id, message.author.id);
    const score = db.prepare(`
        SELECT correctNumbers, failures
        FROM counting_scores
        WHERE guildId = ? AND userId = ?
    `).get(message.guild.id, message.author.id);
    await message.delete().catch(() => {});

    let timeoutApplied = false;
    if (message.member?.moderatable) {
        timeoutApplied = await message.member
            .timeout(game.timeoutSeconds * 1000, "Falló en el minijuego del contador")
            .then(() => true)
            .catch(() => false);
    }

    const sentValue = number === null
        ? message.content.trim().slice(0, 30).replace(/`/g, "") || "mensaje vacío"
        : String(number);
    const progress = levelProgress(score?.correctNumbers || 0);
    const timeoutText = timeoutApplied
        ? formatDuration(game.timeoutSeconds)
        : "No aplicado";

    const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setAuthor({
            name: message.member?.displayName || message.author.username,
            iconURL: message.author.displayAvatarURL({ size: 128 })
        })
        .setTitle("Cadena rota")
        .setDescription(`Envió \`${sentValue}\` — se esperaba \`${expected}\`${repeatedUser ? "\n*No puedes jugar dos turnos consecutivos.*" : ""}`)
        .addFields(
            { name: "Llegaron hasta", value: `\`${game.currentNumber}\``, inline: true },
            { name: "Récord", value: `\`${game.record}\``, inline: true },
            { name: "Timeout", value: `\`${timeoutText}\``, inline: true },
            { name: "Infracciones", value: `\`${score?.failures || 1}\``, inline: true },
            { name: `Nivel ${progress.level}`, value: progress.text, inline: false }
        )
        .setFooter({ text: "El contador vuelve a 1 • Respeta el turno" })
        .setTimestamp();

    await message.channel.send({ embeds: [embed] }).catch(() => {});
    return true;
};
