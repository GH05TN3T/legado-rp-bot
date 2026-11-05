const { EmbedBuilder } = require("discord.js");
const db = require("../database");

const getGame = db.prepare("SELECT * FROM word_chain_game WHERE guildId = ? AND enabled = 1");

function normalizeWord(value) {
    return value
        .trim()
        .toLocaleLowerCase("es")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function isValidWord(value) {
    return /^[a-záéíóúüñ]+$/i.test(value.trim()) && value.trim().length >= 2;
}

function formatDuration(totalSeconds) {
    if (!totalSeconds) return "Desactivado";
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
        const shown = Math.max(1, minutes);
        parts.push(`${shown} minuto${shown === 1 ? "" : "s"}`);
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

const saveSuccess = db.transaction((guildId, userId, word, chainLength) => {
    db.prepare(`
        UPDATE word_chain_game
        SET currentWord = ?, lastUserId = ?, chainLength = ?, record = MAX(record, ?)
        WHERE guildId = ?
    `).run(word, userId, chainLength, chainLength, guildId);

    db.prepare("INSERT INTO word_chain_used (guildId, word) VALUES (?, ?)").run(guildId, word);
    db.prepare(`
        INSERT INTO word_chain_scores (guildId, userId, correctWords, failures)
        VALUES (?, ?, 1, 0)
        ON CONFLICT(guildId, userId) DO UPDATE SET correctWords = correctWords + 1
    `).run(guildId, userId);
});

const saveFailure = db.transaction((guildId, userId) => {
    db.prepare(`
        UPDATE word_chain_game
        SET currentWord = NULL, lastUserId = NULL, chainLength = 0
        WHERE guildId = ?
    `).run(guildId);
    db.prepare("DELETE FROM word_chain_used WHERE guildId = ?").run(guildId);
    db.prepare(`
        INSERT INTO word_chain_scores (guildId, userId, correctWords, failures)
        VALUES (?, ?, 0, 1)
        ON CONFLICT(guildId, userId) DO UPDATE SET failures = failures + 1
    `).run(guildId, userId);
});

module.exports = async function wordChainGame(message) {
    const game = getGame.get(message.guild.id);
    if (!game || message.channel.id !== game.channelId) return false;

    const originalWord = message.content.trim();
    const word = normalizeWord(originalWord);
    const previousWord = game.currentWord;
    const expectedLetter = previousWord ? previousWord.slice(-1) : null;
    const repeatedUser = game.lastUserId === message.author.id;
    const alreadyUsed = word
        ? Boolean(db.prepare("SELECT 1 FROM word_chain_used WHERE guildId = ? AND word = ?").get(message.guild.id, word))
        : false;
    const wrongLetter = expectedLetter && word.charAt(0) !== expectedLetter;
    const invalidFormat = !isValidWord(originalWord);
    const failed = repeatedUser || alreadyUsed || wrongLetter || invalidFormat;

    if (!failed) {
        const nextLength = game.chainLength + 1;
        saveSuccess(message.guild.id, message.author.id, word, nextLength);
        // Emoji Unicode: funciona en cualquier servidor sin depender de un
        // emoji personalizado externo.
        await message.react("✅").catch(error => {
            console.error("[PALABRAS REACTION ERROR]", error);
        });
        return true;
    }

    saveFailure(message.guild.id, message.author.id);
    const score = db.prepare(`
        SELECT correctWords, failures FROM word_chain_scores
        WHERE guildId = ? AND userId = ?
    `).get(message.guild.id, message.author.id);
    await message.delete().catch(() => {});

    let timeoutText = "Desactivado";
    if (game.timeoutSeconds > 0) {
        const applied = message.member?.moderatable
            ? await message.member.timeout(game.timeoutSeconds * 1000, "Falló en palabras encadenadas").then(() => true).catch(() => false)
            : false;
        timeoutText = applied ? formatDuration(game.timeoutSeconds) : "No aplicado";
    }

    let reason = expectedLetter ? `Debía comenzar con \`${expectedLetter.toUpperCase()}\`` : "Formato inválido";
    if (repeatedUser) reason = "No puedes jugar dos turnos consecutivos";
    else if (alreadyUsed) reason = "Esa palabra ya fue utilizada";
    else if (invalidFormat) reason = "Solo se permite una palabra, sin espacios ni números";

    const progress = levelProgress(score?.correctWords || 0);
    const safeWord = originalWord.slice(0, 30).replace(/`/g, "") || "mensaje vacío";
    const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setAuthor({
            name: message.member?.displayName || message.author.username,
            iconURL: message.author.displayAvatarURL({ size: 128 })
        })
        .setTitle("Cadena de palabras rota")
        .setDescription(`Envió \`${safeWord}\`\n${reason}`)
        .addFields(
            { name: "Palabra anterior", value: previousWord ? `\`${previousWord}\`` : "`Ninguna`", inline: true },
            { name: "Llegaron hasta", value: `\`${game.chainLength} palabras\``, inline: true },
            { name: "Récord", value: `\`${game.record}\``, inline: true },
            { name: "Timeout", value: `\`${timeoutText}\``, inline: true },
            { name: "Infracciones", value: `\`${score?.failures || 1}\``, inline: true },
            { name: `Nivel ${progress.level}`, value: progress.text, inline: false }
        )
        .setFooter({ text: "La cadena vuelve a comenzar • Escribe cualquier palabra válida" })
        .setTimestamp();

    await message.channel.send({ embeds: [embed] }).catch(() => {});
    return true;
};
