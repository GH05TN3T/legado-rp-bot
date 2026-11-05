const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder
} = require("discord.js");
const db = require("../../database");

function resetGame(guildId) {
    db.transaction(() => {
        db.prepare("UPDATE word_chain_game SET currentWord = NULL, lastUserId = NULL, chainLength = 0 WHERE guildId = ?").run(guildId);
        db.prepare("DELETE FROM word_chain_used WHERE guildId = ?").run(guildId);
    })();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("palabras")
        .setDescription("Configura el juego de palabras encadenadas")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName("configurar")
                .setDescription("Activa el juego en un canal")
                .addChannelOption(option =>
                    option.setName("canal").setDescription("Canal del juego")
                        .addChannelTypes(ChannelType.GuildText).setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName("timeout").setDescription("Minutos de timeout; 0 lo desactiva")
                        .setMinValue(0).setMaxValue(40320)
                )
        )
        .addSubcommand(subcommand => subcommand.setName("estado").setDescription("Muestra el estado del juego"))
        .addSubcommand(subcommand => subcommand.setName("reiniciar").setDescription("Reinicia la cadena"))
        .addSubcommand(subcommand => subcommand.setName("ranking").setDescription("Muestra el ranking de palabras encadenadas"))
        .addSubcommand(subcommand => subcommand.setName("reiniciar-ranking").setDescription("Borra solamente el ranking de palabras"))
        .addSubcommand(subcommand => subcommand.setName("desactivar").setDescription("Desactiva el juego")),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === "configurar") {
            const channel = interaction.options.getChannel("canal", true);
            const timeoutMinutes = interaction.options.getInteger("timeout") ?? 0;
            const counter = db.prepare("SELECT channelId FROM counting_game WHERE guildId = ? AND enabled = 1").get(guildId);

            if (counter?.channelId === channel.id) {
                await interaction.reply({ content: "❌ Ese canal ya está siendo usado por el contador. Elige otro canal.", ephemeral: true });
                return;
            }

            db.transaction(() => {
                db.prepare(`
                    INSERT INTO word_chain_game
                        (guildId, channelId, currentWord, lastUserId, chainLength, record, timeoutSeconds, enabled)
                    VALUES (?, ?, NULL, NULL, 0, 0, ?, 1)
                    ON CONFLICT(guildId) DO UPDATE SET
                        channelId = excluded.channelId, currentWord = NULL, lastUserId = NULL,
                        chainLength = 0, timeoutSeconds = excluded.timeoutSeconds, enabled = 1
                `).run(guildId, channel.id, timeoutMinutes * 60);
                db.prepare("DELETE FROM word_chain_used WHERE guildId = ?").run(guildId);
            })();

            await interaction.reply({
                content: `✅ Palabras encadenadas activado en ${channel}. La primera persona puede escribir cualquier palabra.${timeoutMinutes ? ` Timeout: **${timeoutMinutes} minuto(s)**.` : " Sin timeout."}`,
                ephemeral: true
            });
            return;
        }

        const game = db.prepare("SELECT * FROM word_chain_game WHERE guildId = ?").get(guildId);
        if (subcommand === "estado") {
            if (!game?.enabled) {
                await interaction.reply({ content: "❌ Palabras encadenadas no está activado.", ephemeral: true });
                return;
            }
            const embed = new EmbedBuilder().setColor(0x00AEEF).setTitle("🔗 Palabras encadenadas").addFields(
                { name: "Canal", value: `<#${game.channelId}>`, inline: true },
                { name: "Palabra actual", value: game.currentWord ? `\`${game.currentWord}\`` : "`Ninguna`", inline: true },
                { name: "Cadena", value: String(game.chainLength), inline: true },
                { name: "Récord", value: String(game.record), inline: true },
                { name: "Timeout", value: game.timeoutSeconds ? `${game.timeoutSeconds / 60} minuto(s)` : "Desactivado", inline: true }
            );
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        if (subcommand === "reiniciar") {
            if (!game?.enabled) {
                await interaction.reply({ content: "❌ El juego no está activado.", ephemeral: true });
                return;
            }
            resetGame(guildId);
            await interaction.reply({ content: `🔄 Cadena reiniciada en <#${game.channelId}>. Pueden comenzar con cualquier palabra.` });
            return;
        }

        if (subcommand === "ranking") {
            const rows = db.prepare(`SELECT userId, correctWords, failures FROM word_chain_scores WHERE guildId = ? ORDER BY correctWords DESC, failures ASC LIMIT 10`).all(guildId);
            const description = rows.length
                ? rows.map((row, i) => `**${i + 1}.** <@${row.userId}> — ${row.correctWords} palabras | ${row.failures} infracciones`).join("\n")
                : "Todavía nadie ha participado.";
            await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00AEEF).setTitle("🏆 Ranking de palabras encadenadas").setDescription(description)] });
            return;
        }

        if (subcommand === "reiniciar-ranking") {
            const result = db.prepare("DELETE FROM word_chain_scores WHERE guildId = ?").run(guildId);
            await interaction.reply({
                content: `✅ Ranking de palabras reiniciado. Se eliminaron **${result.changes}** registro(s).`,
                ephemeral: true
            });
            return;
        }

        if (!game?.enabled) {
            await interaction.reply({ content: "❌ El juego ya está desactivado.", ephemeral: true });
            return;
        }
        db.prepare("UPDATE word_chain_game SET enabled = 0 WHERE guildId = ?").run(guildId);
        await interaction.reply({ content: "✅ Palabras encadenadas desactivado.", ephemeral: true });
    }
};
