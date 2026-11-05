const logger = require("../logger");

module.exports = {
    name: "interactionCreate",

    async execute(interaction) {
        if (!interaction.inGuild() || !interaction.isChatInputCommand()) return;

        const options = interaction.options.data
            .map(option => `${option.name}: ${String(option.value ?? "subcomando")}`)
            .join("\n") || "Sin opciones";

        await logger.sendLog(interaction.guild, { type: "commands",
            title: "⌨️ Comando utilizado",
            color: 0x5865F2,
            user: interaction.user,
            fields: [
                { name: "Usuario", value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                { name: "Canal", value: `${interaction.channel}`, inline: true },
                { name: "Comando", value: `/${interaction.commandName}` },
                { name: "Opciones", value: options.slice(0, 1024) }
            ]
        });
    }
};
