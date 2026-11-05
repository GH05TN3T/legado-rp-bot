const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");
const config = require("./config");

const commandsByName = new Map();
const commandsPath = path.join(__dirname, "commands");

const discordToken = process.env.DISCORD_TOKEN;

if (!discordToken || !config.clientId) {
    console.error("❌ Faltan DISCORD_TOKEN o DISCORD_CLIENT_ID en las variables de entorno.");
    process.exit(1);
}

try {
    const folders = fs.readdirSync(commandsPath, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);

    for (const folder of folders) {
        const folderPath = path.join(commandsPath, folder);
        const files = fs.readdirSync(folderPath)
            .filter(file => file.endsWith(".js"));

        for (const file of files) {
            const filePath = path.join(folderPath, file);

            try {
                delete require.cache[require.resolve(filePath)];
                const command = require(filePath);

                if (!command?.data?.toJSON) {
                    console.warn(`⚠️ Ignorado: ${folder}/${file} no contiene command.data válido.`);
                    continue;
                }

                const json = command.data.toJSON();
                if (commandsByName.has(json.name)) {
                    console.error(`❌ Comando duplicado dentro del bot: /${json.name}`);
                    console.error(`   Revisa los archivos ${commandsByName.get(json.name)._source} y ${folder}/${file}.`);
                    process.exit(1);
                }

                Object.defineProperty(json, "_source", {
                    value: `${folder}/${file}`,
                    enumerable: false
                });
                commandsByName.set(json.name, json);
                console.log(`✅ Cargado para registrar: /${json.name}`);
            } catch (error) {
                console.error(`❌ Error cargando ${folder}/${file}:`);
                console.error(error);
                process.exit(1);
            }
        }
    }
} catch (error) {
    console.error("❌ Error leyendo la carpeta commands:");
    console.error(error);
    process.exit(1);
}

const commands = [...commandsByName.values()];

if (!commands.length) {
    console.error("❌ No se encontró ningún Slash Command para registrar.");
    process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(discordToken);

(async () => {
    try {
        console.log("\n🧹 Eliminando comandos globales antiguos para evitar duplicados...");
        await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: [] }
        );

        const guilds = await rest.get(Routes.userGuilds());

        if (!Array.isArray(guilds) || guilds.length === 0) {
            console.error("❌ El bot no está dentro de ningún servidor.");
            process.exit(1);
        }

        console.log(`⏳ Publicando ${commands.length} comandos en ${guilds.length} servidor(es)...`);

        for (const guild of guilds) {
            const data = await rest.put(
                Routes.applicationGuildCommands(config.clientId, guild.id),
                { body: commands }
            );
            console.log(`✅ ${guild.name}: ${data.length} comandos registrados.`);
        }

        console.log("\n✅ Despliegue terminado sin comandos duplicados.");
        console.log("ℹ️ Los comandos del servidor aparecen casi inmediatamente; reinicia Discord si no refrescan.");
    } catch (error) {
        console.error("\n❌ Discord rechazó el registro de comandos:");
        console.error(error?.rawError || error);
        process.exit(1);
    }
})();
