const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const db = require("../../database");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("verificador")
        .setDescription("Publica el panel de verificación del servidor.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(option =>
            option
                .setName("rol")
                .setDescription("Rol que recibirán los usuarios verificados")
                .setRequired(true)
        )
        .addChannelOption(option =>
            option
                .setName("canal")
                .setDescription("Canal donde se publicará el panel")
                .setRequired(true)
        ),

    async execute(interaction) {
        const role = interaction.options.getRole("rol", true);
        const channel = interaction.options.getChannel("canal", true);
        const botMember = interaction.guild.members.me;

        if (!channel.isTextBased() || typeof channel.send !== "function") {
            return interaction.reply({
                content: "❌ Debes seleccionar un canal donde se puedan enviar mensajes.",
                ephemeral: true
            });
        }

        const channelPermissions = channel.permissionsFor(botMember);

        if (!channelPermissions?.has([
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks
        ])) {
            return interaction.reply({
                content: "❌ No puedo publicar en ese canal. Necesito **Ver canal**, **Enviar mensajes** e **Insertar enlaces**.",
                ephemeral: true
            });
        }

        if (role.managed || role.id === interaction.guild.id) {
            return interaction.reply({
                content: "❌ Ese rol no puede ser entregado por el bot.",
                ephemeral: true
            });
        }

        if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({
                content: "❌ El bot necesita el permiso **Administrar roles**.",
                ephemeral: true
            });
        }

        if (botMember.roles.highest.comparePositionTo(role) <= 0) {
            return interaction.reply({
                content: "❌ El rol del bot debe estar por encima del rol de verificado.",
                ephemeral: true
            });
        }

        db.prepare(`
            INSERT INTO config(guildId, verificationRoleId)
            VALUES(?, ?)
            ON CONFLICT(guildId)
            DO UPDATE SET verificationRoleId = excluded.verificationRoleId
        `).run(interaction.guild.id, role.id);

        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle("✅ Verificación del servidor")
            .setDescription(
                "Presiona el botón **Verificarme** para recibir acceso al servidor.\n\n" +
                "El proceso es automático y solo guarda información pública disponible en Discord."
            )
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setFooter({ text: interaction.guild.name })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("verify_member")
                .setLabel("Verificarme")
                .setEmoji("✅")
                .setStyle(ButtonStyle.Success)
        );

        await channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({
            content: `✅ Panel publicado en ${channel}. El rol configurado es ${role}.`,
            ephemeral: true
        });
    }
};
