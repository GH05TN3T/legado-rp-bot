const {
    Client,
    GatewayIntentBits,
    Collection,
    Partials
} = require("discord.js");

const db = require("./database");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.GuildMember
    ]
});

client.commands = new Collection();

require("./handlers/commandHandler")(client);
require("./handlers/eventHandler")(client);

let shuttingDown = false;

async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`\n🛑 Cerrando bot (${signal})...`);

    try {
        client.destroy();
    } catch (error) {
        console.error("Error cerrando Discord:", error);
    }

    try {
        if (db?.open) db.close();
    } catch (error) {
        console.error("Error cerrando la base de datos:", error);
    }

    process.exit(0);
}

process.once("SIGINT", () => shutdown("CTRL+C"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

process.on("uncaughtException", (error) => {
    console.error("❌ Error no controlado:", error);
});

process.on("unhandledRejection", (error) => {
    console.error("❌ Promesa rechazada:", error);
});

if (!process.env.DISCORD_TOKEN) {
    console.error("❌ Falta la variable de entorno DISCORD_TOKEN.");
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN).catch((error) => {
    console.error("❌ No se pudo iniciar sesión:", error);
    shutdown("LOGIN_ERROR");
});
