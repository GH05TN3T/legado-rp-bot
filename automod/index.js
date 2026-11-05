const spam = require("./spam");
const links = require("./links");
const invites = require("./invites");
const everyone = require("./everyone");
const massmention = require("./massmention");
const ghostping = require("./ghostping");
const caps = require("./caps");
const emojis = require("./emojis");
const badwords = require("./badwords");
const scam = require("./scam");

const whitelist = require("../whitelist");

module.exports = async (message) => {

    if (whitelist.isWhitelisted(message.guild.id, message.author.id))
        return false;

    if (await spam(message)) return true;

    if (await links(message)) return true;

    // Analizar estafas antes de continuar
    if (await scam(message)) return true;

    if (await invites(message)) return true;

    if (await everyone(message)) return true;

    if (await massmention(message)) return true;

    if (await ghostping(message)) return true;

    if (await caps(message)) return true;

    if (await emojis(message)) return true;

    if (await badwords(message)) return true;

    return false;

};