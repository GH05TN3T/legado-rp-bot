const fs = require("fs");
const path = require("path");

module.exports = (client) => {

    const commandsPath = path.join(__dirname, "..", "commands");

    const folders = fs.readdirSync(commandsPath);

    for (const folder of folders) {

        const folderPath = path.join(commandsPath, folder);

        const commandFiles = fs
            .readdirSync(folderPath)
            .filter(file => file.endsWith(".js"));

        for (const file of commandFiles) {

            const filePath = path.join(folderPath, file);

            const command = require(filePath);

            client.commands.set(command.data.name, command);

            console.log(`✅ Comando cargado: ${command.data.name}`);

        }

    }

};