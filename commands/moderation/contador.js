const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder
} = require("discord.js");
const db = require("../../database");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("contador")
        .setDescription("Configura y administra el minijuego del contador")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName("configurar")
                .setDescription("Activa el juego en un canal")
                .addChannelOption(option =>
                    option
                        .setName("canal")
                        .setDescription("Canal donde se jugará")
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName("timeout")
                        .setDescription("Minutos de timeout por fallar (predeterminado: 5)")
                        .setMinValue(1)
                        .setMaxValue(40320)
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName("estado").setDescription("Muestra el progreso y la configuración")
        )
        .addSubcommand(subcommand =>
            subcommand.setName("reiniciar").setDescription("Reinicia el contador desde 1")
        )
        .addSubcommand(subcommand =>
            subcommand.setName("ranking").setDescription("Muestra los mejores jugadores")
        )
        .addSubcommand(subcommand =>
            subcommand.setName("reiniciar-ranking").setDescription("Borra solamente el ranking del contador")
        )
        .addSubcommand(subcommand =>
            subcommand.setName("desactivar").setDescription("Desactiva el minijuego")
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === "configurar") {
            console.log(`[CONTADOR CONFIGURAR v2] guild=${guildId}`);

            // Confirma la interacción antes de acceder a SQLite. Discord invalida
            // los comandos que no reciben una respuesta inicial en pocos segundos.
            await interaction.deferReply({ ephemeral: true });

            const channel = interaction.options.getChannel("canal", true);
            const timeoutMinutes = interaction.options.getInteger("timeout") ?? 5;

            db.prepare(`
                INSERT INTO counting_game
                    (guildId, channelId, currentNumber, lastUserId, record, timeoutSeconds, enabled)
                VALUES (?, ?, 0, NULL, 0, ?, 1)
                ON CONFLICT(guildId) DO UPDATE SET
                    channelId = excluded.channelId,
                    currentNumber = 0,
                    lastUserId = NULL,
                    timeoutSeconds = excluded.timeoutSeconds,
                    enabled = 1
            `).run(guildId, channel.id, timeoutMinutes * 60);

            await interaction.editReply({
                content: `✅ Contador activado en ${channel}. Empiecen escribiendo **1**. Quien falle recibirá **${timeoutMinutes} minuto(s)** de timeout.`
            });
            return;
        }

        const game = db.prepare("SELECT * FROM counting_game WHERE guildId = ?").get(guildId);

        if (subcommand === "estado") {
            if (!game || !game.enabled) {
                await interaction.reply({ content: "❌ El contador no está activado.", ephemeral: true });
                return;
            }

            const embed = new EmbedBuilder()
                .setColor(0x00AEEF)
                .setTitle("🔢 Estado del contador")
                .addFields(
                    { name: "Canal", value: `<#${game.channelId}>`, inline: true },
                    { name: "Número actual", value: String(game.currentNumber), inline: true },
                    { name: "Récord", value: String(game.record), inline: true },
                    { name: "Timeout", value: `${Math.ceil(game.timeoutSeconds / 60)} minuto(s)`, inline: true }
                );

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        if (subcommand === "reiniciar") {
            if (!game || !game.enabled) {
                await interaction.reply({ content: "❌ El contador no está activado.", ephemeral: true });
                return;
            }

            db.prepare("UPDATE counting_game SET currentNumber = 0, lastUserId = NULL WHERE guildId = ?").run(guildId);
            await interaction.reply({ content: `🔄 Contador reiniciado. Continúen con **1** en <#${game.channelId}>.` });
            return;
        }

        if (subcommand === "ranking") {
            const rows = db.prepare(`
                SELECT userId, correctNumbers, failures
                FROM counting_scores
                WHERE guildId = ?
                ORDER BY correctNumbers DESC, failures ASC
                LIMIT 10
            `).all(guildId);

            const description = rows.length
                ? rows.map((row, index) => `**${index + 1}.** <@${row.userId}> — ${row.correctNumbers} correctos | ${row.failures} fallos`).join("\n")
                : "Todavía nadie ha participado.";

            await interaction.reply({
                embeds: [new EmbedBuilder().setColor(0x00AEEF).setTitle("🏆 Ranking del contador").setDescription(description)]
            });
            return;
        }

        if (subcommand === "reiniciar-ranking") {
            const result = db.prepare("DELETE FROM counting_scores WHERE guildId = ?").run(guildId);
            await interaction.reply({
                content: `✅ Ranking del contador reiniciado. Se eliminaron **${result.changes}** registro(s).`,
                ephemeral: true
            });
            return;
        }

        if (!game || !game.enabled) {
            await interaction.reply({ content: "❌ El contador ya está desactivado.", ephemeral: true });
            return;
        }

        db.prepare("UPDATE counting_game SET enabled = 0 WHERE guildId = ?").run(guildId);
        await interaction.reply({ content: "✅ Minijuego del contador desactivado.", ephemeral: true });
    }
};
