const {
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

const whitelist = require("../../whitelist");
const logger = require("../../logger");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("whitelistadmin")
        .setDescription("Administrar la whitelist del AutoMod.")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )
        .addSubcommand(sub =>
            sub
                .setName("add")
                .setDescription("Añadir un usuario a la whitelist.")
                .addUserOption(option =>
                    option
                        .setName("usuario")
                        .setDescription("Usuario")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("remove")
                .setDescription("Eliminar un usuario de la whitelist.")
                .addUserOption(option =>
                    option
                        .setName("usuario")
                        .setDescription("Usuario")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("check")
                .setDescription("Comprobar si un usuario está en la whitelist.")
                .addUserOption(option =>
                    option
                        .setName("usuario")
                        .setDescription("Usuario")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("list")
                .setDescription("Mostrar la whitelist.")
        ),

    async execute(interaction) {

        const sub = interaction.options.getSubcommand();

        if (sub === "add") {

            const user = interaction.options.getUser("usuario");

            whitelist.add(
                interaction.guild.id,
                user.id,
                interaction.user.id
            );

            logger.sendLog(interaction.guild, { type: "moderation",
                user,
                title: "✅ Usuario añadido a la Whitelist",
                color: 0x57F287,
                fields: [
                    {
                        name: "Usuario",
                        value: `${user.tag}`,
                        inline: true
                    },
                    {
                        name: "Moderador",
                        value: `${interaction.user.tag}`,
                        inline: true
                    }
                ]
            });

            return interaction.reply({
                content: `✅ **${user.tag}** fue añadido a la whitelist.`,
                ephemeral: true
            });

        }

        if (sub === "remove") {

            const user = interaction.options.getUser("usuario");

            whitelist.remove(
                interaction.guild.id,
                user.id
            );

            logger.sendLog(interaction.guild, { type: "moderation",
                user,
                title: "❌ Usuario eliminado de la Whitelist",
                color: 0xED4245,
                fields: [
                    {
                        name: "Usuario",
                        value: `${user.tag}`,
                        inline: true
                    },
                    {
                        name: "Moderador",
                        value: `${interaction.user.tag}`,
                        inline: true
                    }
                ]
            });

            return interaction.reply({
                content: `❌ **${user.tag}** fue eliminado de la whitelist.`,
                ephemeral: true
            });

        }

        if (sub === "check") {

            const user = interaction.options.getUser("usuario");

            const exists = whitelist.isWhitelisted(
                interaction.guild.id,
                user.id
            );

            return interaction.reply({
                content: exists
                    ? `✅ **${user.tag}** está en la whitelist.`
                    : `❌ **${user.tag}** no está en la whitelist.`,
                ephemeral: true
            });

        }

        if (sub === "list") {

            const users = whitelist.list(interaction.guild.id);

            if (!users.length) {

                return interaction.reply({
                    content: "📋 La whitelist está vacía.",
                    ephemeral: true
                });

            }

            const text = users
                .map(x => `<@${x.userId}>`)
                .join("\n");

            return interaction.reply({
                content: `## 📋 Whitelist\n${text}`,
                ephemeral: true
            });

        }

    }

};
