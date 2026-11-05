const config = require("../config/automod");
const { addWarning } = require("../utils/warnings");

const suspiciousDomains = [
    "dlscord",
    "d1scord",
    "disc0rd",
    "discord-nitro",
    "discordnitro",
    "discordgift",
    "discord-gifts",
    "gift-discord",
    "verify-discord",
    "discordverify",
    "free-nitro",
    "nitrofree",
    "claimnitro",
    "steamcomminity",
    "stearncommunity",
    "steamgift",
    "steam-gift",
    "epicgames-free",
    "robuxfree",
    "claimgift",
    "discord-airdrop"
];

const shorteners = [
    "bit.ly",
    "tinyurl.com",
    "cutt.ly",
    "t.ly",
    "rb.gy",
    "goo.su",
    "rebrand.ly",
    "is.gd",
    "ow.ly",
    "shorturl.at"
];

const keywords = [
    "free nitro",
    "discord nitro",
    "steam gift",
    "claim your gift",
    "claim gift",
    "claim reward",
    "verify your account",
    "verify account",
    "discord support",
    "discord staff",
    "limited offer",
    "gift waiting",
    "free robux",
    "airdrop",
    "login to claim",
    "claim now",
    "click here",
    "free premium",
    "gift inventory"
];

const linkRegex =
    /(https?:\/\/|www\.|discord\.gg\/|discord\.com\/)/i;

module.exports = async (message) => {

    if (!config.scam?.enabled)
        return false;

    if (!message.guild)
        return false;

    if (message.author.bot)
        return false;

    if (message.member.permissions.has("Administrator"))
        return false;

    const content = message.content.toLowerCase();

    let score = 0;

    const hasLink = linkRegex.test(content);

    if (hasLink)
        score += 2;

    if (suspiciousDomains.some(domain => content.includes(domain)))
        score += 5;

    if (shorteners.some(domain => content.includes(domain)))
        score += 2;

    const foundKeywords = keywords.filter(word =>
        content.includes(word)
    );

    score += foundKeywords.length * 2;

    if (content.includes("@everyone") && hasLink)
        score += 2;

    if (content.includes("@here") && hasLink)
        score += 2;

    if (score < 5)
        return false;

    try {
        await message.delete();
    } catch {}

    try {
        const warns = await addWarning(
            message.member,
            "Automod | Posible estafa / phishing"
        );

        console.log(
            `[AUTOMOD] Scam bloqueado | ${message.author.tag} | Advertencias: ${warns}`
        );
    } catch (err) {
        console.error("[SCAM]", err);
    }

    try {
        await message.channel.send({
            content: `⚠️ ${message.author}, tu mensaje fue eliminado porque fue detectado como un posible intento de estafa o phishing.`
        }).then(msg => {
            setTimeout(() => {
                msg.delete().catch(() => {});
            }, 5000);
        });
    } catch {}

    return true;

};