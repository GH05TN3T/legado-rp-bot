const logger = require("../logger");

module.exports = {
    name: "messageUpdate",

    async execute(oldMessage, newMessage) {

        if (!oldMessage.guild) return;

        const author = oldMessage.author ?? newMessage.author;

        if (!author) return;
        if (author.bot) return;

        if (oldMessage.content === newMessage.content) return;

        logger.sendLog(oldMessage.guild, { type: "messages",
            user: author,
            title: "✏️ Mensaje editado",
            color: 0xFEE75C,
            fields: [
                {
                    name: "👤 Usuario",
                    value: `${author}`,
                    inline: true
                },
                {
                    name: "📺 Canal",
                    value: `${oldMessage.channel}`,
                    inline: true
                },
                {
                    name: "📝 Antes",
                    value: oldMessage.content || "*Vacío*"
                },
                {
                    name: "📝 Después",
                    value: newMessage.content || "*Vacío*"
                }
            ]
        });

    }
};