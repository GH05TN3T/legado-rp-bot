const config = require("../config/automod");
const { addWarning } = require("../utils/warnings");

const cache = new Map();

module.exports = async (message) => {

    if (!config.enabled) return false;
    if (!config.spam.enabled) return false;

    if (message.author.bot) return false;
    if (!message.guild) return false;

    const id = message.author.id;
    const now = Date.now();

    if (!cache.has(id))
        cache.set(id, []);

    const messages = cache.get(id);

    messages.push(now);

    while (
        messages.length &&
        now - messages[0] > config.spam.interval
    ) {
        messages.shift();
    }

    if (messages.length < config.spam.maxMessages)
        return false;

    cache.delete(id);

    await message.delete().catch(() => {});

    const warns = await addWarning(
        message.member,
        "Spam"
    );

    console.log(
        `[AUTOMOD] Spam detectado -> ${message.author.tag} (${warns} warns)`
    );

    return true;

};