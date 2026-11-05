const logger = require("../logger");

module.exports = {
    name: "messageDelete",

    async execute(message) {

        if (!message.guild) return;

        const author = message.author;

        logger.sendLog(message.guild, { type: "messages",
            title: "🗑️ Mensaje eliminado",
            color: 0xED4245,
            thumbnail: author?.displayAvatarURL({ dynamic: true }) ?? null,
            fields: [
                {
                    name: "👤 Usuario",
                    value: author ? `${author} (${author.tag})` : "Desconocido",
                    inline: true
                },
                {
                    name: "🆔 ID",
                    value: author?.id ?? "Desconocido",
                    inline: true
                },
                {
                    name: "📺 Canal",
                    value: `${message.channel}`,
                    inline: true
                },
                {
                    name: "💬 Contenido",
                    value: message.content || "*Sin contenido*"
                }
            ]
        });

    }
};