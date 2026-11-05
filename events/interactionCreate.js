const { MessageFlags } = require("discord.js");

module.exports = {
    name: "interactionCreate",

    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);
        console.log(
            `[COMMAND RECEIVED] /${interaction.commandName}`,
            `subcommand=${interaction.options.getSubcommand(false) || "none"}`,
            `guild=${interaction.guildId || "DM"}`
        );

        if (!command) {
            console.error(`[COMMAND NOT LOADED] /${interaction.commandName}`);
            await interaction.reply({
                content: "❌ El comando existe en Discord, pero no está cargado en esta instancia del bot. Reinicia el bot y revisa la consola.",
                flags: MessageFlags.Ephemeral
            }).catch(error => console.error("[COMMAND NOT LOADED RESPONSE]", error));
            return;
        }

        try {
            await command.execute(interaction);
        } catch (err) {
            console.error(`[COMMAND ERROR /${interaction.commandName}]`, err);

            const payload = { content: "❌ Ocurrió un error al ejecutar el comando." };

            try {
                if (interaction.deferred) {
                    await interaction.editReply(payload);
                } else if (interaction.replied) {
                    await interaction.followUp({
                        ...payload,
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    await interaction.reply({
                        ...payload,
                        flags: MessageFlags.Ephemeral
                    });
                }
            } catch (responseError) {
                // Si Discord ya invalidó la interacción, no intentamos responder otra vez.
                if (![10062, 40060, 50027].includes(responseError?.code)) {
                    console.error("[INTERACTION ERROR RESPONSE]", responseError);
                }
            }
        }
    }
};
