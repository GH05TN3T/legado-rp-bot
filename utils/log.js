const { EmbedBuilder } = require("discord.js");
const db = require("../database");

module.exports = async function log(guild, title, color, fields = []) {

    try {

        const config = db.prepare(`
            SELECT logsChannel
            FROM config
            WHERE guildId = ?
        `).get(guild.id);

        if (!config || !config.logsChannel)
            return;

        const channel = guild.channels.cache.get(config.logsChannel);

        if (!channel)
            return;

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setFields(fields)
            .setTimestamp();

        await channel.send({
            embeds: [embed]
        });

    } catch (err) {

        console.error("[LOGGER]", err);

    }

};