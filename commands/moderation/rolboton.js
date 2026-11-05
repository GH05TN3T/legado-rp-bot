const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

const STYLE_MAP = {
    azul: ButtonStyle.Primary,
    gris: ButtonStyle.Secondary,
    verde: ButtonStyle.Success,
    rojo: ButtonStyle.Danger
};

function cloneButton(component) {
    return ButtonBuilder.from(component);
}

function rebuildRows(message) {
    return message.components.map(row => {
        const newRow = new ActionRowBuilder();
        for (const component of row.components) {
            newRow.addComponents(cloneButton(component));
        }
        return newRow;
    });
}

function totalButtons(rows) {
    return rows.reduce((total, row) => total + row.components.length, 0);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rolboton")
        .setDescription("Crea y administra un panel de autoroles con botones.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addSubcommand(sub =>
            sub.setName("crear")
                .setDescription("Crea un panel visual de autoroles con banner y logo.")
                .addChannelOption(option =>
                    option.setName("canal")
                        .setDescription("Canal donde se publicará el panel")
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName("encabezado")
                        .setDescription("Texto pequeño superior, por ejemplo ROLE")
                        .setMaxLength(100)
                )
                .addStringOption(option =>
                    option.setName("titulo")
                        .setDescription("Título principal, por ejemplo ELIGE TU ROL 👬")
                        .setMaxLength(256)
                )
                .addStringOption(option =>
                    option.setName("descripcion")
                        .setDescription("Texto debajo del título (opcional)")
                        .setMaxLength(1000)
                )
                .addAttachmentOption(option =>
                    option.setName("banner")
                        .setDescription("Banner grande del panel (PNG/JPG/WebP)")
                )
                .addAttachmentOption(option =>
                    option.setName("logo")
                        .setDescription("Logo que aparecerá arriba a la derecha (PNG/JPG/WebP)")
                )
                .addStringOption(option =>
                    option.setName("color")
                        .setDescription("Color lateral del panel en HEX, por ejemplo 2BB8F0")
                        .setMaxLength(7)
                )
        )

        .addSubcommand(sub =>
            sub.setName("agregar")
                .setDescription("Añade un botón de rol a un panel existente.")
                .addChannelOption(option =>
                    option.setName("canal")
                        .setDescription("Canal donde está el panel")
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName("mensaje")
                        .setDescription("ID del mensaje del panel")
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option.setName("rol")
                        .setDescription("Rol que dará o quitará el botón")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName("emoji")
                        .setDescription("Emoji o bandera, por ejemplo 🇩🇴")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName("texto")
                        .setDescription("Texto fijo. Si no lo pones, mostrará la cantidad de miembros")
                        .setMaxLength(80)
                )
                .addStringOption(option =>
                    option.setName("estilo")
                        .setDescription("Color del botón")
                        .addChoices(
                            { name: "Gris (como la imagen)", value: "gris" },
                            { name: "Azul", value: "azul" },
                            { name: "Verde", value: "verde" },
                            { name: "Rojo", value: "rojo" }
                        )
                )
        )

        .addSubcommand(sub =>
            sub.setName("editar")
                .setDescription("Edita el diseño del panel sin borrar sus botones ni roles.")
                .addChannelOption(option =>
                    option.setName("canal")
                        .setDescription("Canal donde está el panel")
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName("mensaje")
                        .setDescription("ID del mensaje del panel")
                        .setRequired(true)
                )
                .addAttachmentOption(option =>
                    option.setName("banner")
                        .setDescription("Nuevo banner (si no lo pones, conserva el actual)")
                )
                .addAttachmentOption(option =>
                    option.setName("logo")
                        .setDescription("Nuevo logo (si no lo pones, conserva el actual)")
                )
                .addStringOption(option =>
                    option.setName("encabezado")
                        .setDescription("Nuevo texto pequeño superior")
                        .setMaxLength(100)
                )
                .addStringOption(option =>
                    option.setName("titulo")
                        .setDescription("Nuevo título principal")
                        .setMaxLength(256)
                )
                .addStringOption(option =>
                    option.setName("descripcion")
                        .setDescription("Nueva descripción")
                        .setMaxLength(1000)
                )
                .addStringOption(option =>
                    option.setName("color")
                        .setDescription("Nuevo color HEX, por ejemplo 2BB8F0")
                        .setMaxLength(7)
                )
        )

        .addSubcommand(sub =>
            sub.setName("quitar")
                .setDescription("Quita del panel el botón asociado a un rol.")
                .addChannelOption(option =>
                    option.setName("canal")
                        .setDescription("Canal donde está el panel")
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName("mensaje")
                        .setDescription("ID del mensaje del panel")
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option.setName("rol")
                        .setDescription("Rol cuyo botón quieres quitar")
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        // Reconocemos la interacción inmediatamente para evitar DiscordAPIError[10062]
        // mientras se suben imágenes, se buscan miembros o se edita el panel.
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const subcommand = interaction.options.getSubcommand();
        const botMember = interaction.guild.members.me;

        if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.editReply({
                content: "❌ El bot necesita el permiso **Administrar roles**.",
            });
        }

        if (subcommand === "crear") {
            const channel = interaction.options.getChannel("canal", true);
            const header = interaction.options.getString("encabezado") || "ROLE";
            const title = interaction.options.getString("titulo") || "ELIGE TU ROL 👬";
            const description = interaction.options.getString("descripcion");
            const banner = interaction.options.getAttachment("banner");
            const logo = interaction.options.getAttachment("logo");
            const colorInput = (interaction.options.getString("color") || "2BB8F0").replace(/^#/, "");

            if (!/^[0-9A-Fa-f]{6}$/.test(colorInput)) {
                return interaction.editReply({
                    content: "❌ El color debe ser HEX de 6 caracteres. Ejemplo: `2BB8F0`.",
                    });
            }

            const isImage = attachment => !attachment || attachment.contentType?.startsWith("image/");
            if (!isImage(banner) || !isImage(logo)) {
                return interaction.editReply({
                    content: "❌ El banner y el logo deben ser imágenes PNG, JPG, JPEG o WebP.",
                    });
            }

            const permissions = channel.permissionsFor(botMember);
            if (!permissions?.has([
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.EmbedLinks
            ])) {
                return interaction.editReply({
                    content: "❌ Necesito **Ver canal**, **Enviar mensajes**, **Leer historial**, **Adjuntar archivos** e **Insertar enlaces** en ese canal.",
                    });
            }

            const embed = new EmbedBuilder()
                .setColor(parseInt(colorInput, 16))
                .setAuthor({ name: header })
                .setTitle(title);

            if (description) embed.setDescription(description);

            const files = [];

            if (logo) {
                const logoExt = (logo.name?.split(".").pop() || "png").replace(/[^a-zA-Z0-9]/g, "") || "png";
                const logoName = `role-logo.${logoExt}`;
                files.push({ attachment: logo.url, name: logoName });
                embed.setThumbnail(`attachment://${logoName}`);
            }

            if (banner) {
                const bannerExt = (banner.name?.split(".").pop() || "png").replace(/[^a-zA-Z0-9]/g, "") || "png";
                const bannerName = `role-banner.${bannerExt}`;
                files.push({ attachment: banner.url, name: bannerName });
                embed.setImage(`attachment://${bannerName}`);
            }

            const panel = await channel.send({
                embeds: [embed],
                files
            });

            return interaction.editReply({
                content: `✅ Panel creado en ${channel}.\n**ID del mensaje:** \`${panel.id}\`\nAhora usa \`/rolboton agregar\` para añadir las banderas/roles debajo del banner.`,
            });
        }

        const channel = interaction.options.getChannel("canal", true);
        const messageId = interaction.options.getString("mensaje", true).trim();

        const message = await channel.messages.fetch(messageId).catch(() => null);
        if (!message || message.author.id !== interaction.client.user.id) {
            return interaction.editReply({
                content: "❌ No encontré ese panel o el mensaje no fue enviado por este bot.",
            });
        }

        if (subcommand === "editar") {
            const permissions = channel.permissionsFor(botMember);
            if (!permissions?.has([
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.EmbedLinks
            ])) {
                return interaction.editReply({
                    content: "❌ Necesito **Ver canal**, **Enviar mensajes**, **Leer historial**, **Adjuntar archivos** e **Insertar enlaces** en ese canal.",
                });
            }

            const oldEmbed = message.embeds[0];
            if (!oldEmbed) {
                return interaction.editReply({
                    content: "❌ Ese mensaje no tiene un panel embed que pueda editar.",
                });
            }

            const header = interaction.options.getString("encabezado");
            const title = interaction.options.getString("titulo");
            const description = interaction.options.getString("descripcion");
            const banner = interaction.options.getAttachment("banner");
            const logo = interaction.options.getAttachment("logo");
            const colorRaw = interaction.options.getString("color");

            const isImage = attachment => !attachment || attachment.contentType?.startsWith("image/");
            if (!isImage(banner) || !isImage(logo)) {
                return interaction.editReply({
                    content: "❌ El banner y el logo deben ser imágenes PNG, JPG, JPEG o WebP.",
                });
            }

            let colorValue = null;
            if (colorRaw) {
                const normalized = colorRaw.replace(/^#/, "");
                if (!/^[0-9A-Fa-f]{6}$/.test(normalized)) {
                    return interaction.editReply({
                        content: "❌ El color debe ser HEX de 6 caracteres. Ejemplo: `2BB8F0`.",
                    });
                }
                colorValue = parseInt(normalized, 16);
            }

            if (!header && !title && !description && !banner && !logo && !colorRaw) {
                return interaction.editReply({
                    content: "❌ Debes indicar al menos un cambio: banner, logo, encabezado, título, descripción o color.",
                });
            }

            const embed = EmbedBuilder.from(oldEmbed);
            if (header) embed.setAuthor({ name: header });
            if (title) embed.setTitle(title);
            if (description) embed.setDescription(description);
            if (colorValue !== null) embed.setColor(colorValue);

            const files = [];
            const unique = Date.now();

            if (logo) {
                const logoExt = (logo.name?.split(".").pop() || "png").replace(/[^a-zA-Z0-9]/g, "") || "png";
                const logoName = `role-logo-${unique}.${logoExt}`;
                files.push({ attachment: logo.url, name: logoName });
                embed.setThumbnail(`attachment://${logoName}`);
            }

            if (banner) {
                const bannerExt = (banner.name?.split(".").pop() || "png").replace(/[^a-zA-Z0-9]/g, "") || "png";
                const bannerName = `role-banner-${unique}.${bannerExt}`;
                files.push({ attachment: banner.url, name: bannerName });
                embed.setImage(`attachment://${bannerName}`);
            }

            await message.edit({
                embeds: [embed],
                components: rebuildRows(message),
                files
            });

            return interaction.editReply({
                content: `✅ Panel actualizado sin borrar los botones ni roles.\n**Mensaje:** \`${message.id}\``,
            });
        }

        const role = interaction.options.getRole("rol", true);

        if (role.managed || role.id === interaction.guild.id) {
            return interaction.editReply({ content: "❌ Ese rol no puede ser administrado por el bot." });
        }

        if (botMember.roles.highest.comparePositionTo(role) <= 0) {
            return interaction.editReply({
                content: `❌ El rol del bot debe estar por encima de ${role}.`,
            });
        }

        let rows = rebuildRows(message);

        if (subcommand === "quitar") {
            const targetId = `selfrole:${role.id}`;
            let removed = false;
            const newRows = [];

            for (const row of rows) {
                const kept = row.components.filter(component => component.data.custom_id !== targetId);
                if (kept.length !== row.components.length) removed = true;
                if (kept.length > 0) {
                    newRows.push(new ActionRowBuilder().addComponents(...kept));
                }
            }

            if (!removed) {
                return interaction.editReply({
                    content: `❌ Ese panel no tiene un botón para ${role}.`,
                    });
            }

            await message.edit({ components: newRows });
            return interaction.editReply({ content: `✅ Botón de ${role} eliminado.` });
        }

        if (subcommand === "agregar") {
            if (totalButtons(rows) >= 25) {
                return interaction.editReply({
                    content: "❌ Un mensaje de Discord admite un máximo de **25 botones** (5 por fila).",
                    });
            }

            const duplicate = rows.some(row =>
                row.components.some(component => component.data.custom_id === `selfrole:${role.id}`)
            );

            if (duplicate) {
                return interaction.editReply({
                    content: `❌ Ese panel ya tiene un botón para ${role}.`,
                    });
            }

            await interaction.guild.members.fetch().catch(() => null);

            const emoji = interaction.options.getString("emoji", true);
            const fixedText = interaction.options.getString("texto");
            const styleName = interaction.options.getString("estilo") || "gris";
            const label = fixedText || String(role.members.size);

            const button = new ButtonBuilder()
                .setCustomId(`selfrole:${role.id}`)
                .setLabel(label)
                .setStyle(STYLE_MAP[styleName]);

            try {
                button.setEmoji(emoji);
            } catch (error) {
                return interaction.editReply({
                    content: "❌ Ese emoji no es válido para un botón. Prueba con un emoji normal como 🇩🇴 o ✅.",
                    });
            }

            // Marcamos si el botón debe mostrar conteo automático.
            // El sufijo :count no cabe en el roleId parseado del sistema anterior, así que
            // usamos el customId selfrolecount para distinguirlo sin guardar configuración externa.
            if (!fixedText) button.setCustomId(`selfrolecount:${role.id}`);

            const lastRow = rows[rows.length - 1];
            if (!lastRow || lastRow.components.length >= 5) {
                rows.push(new ActionRowBuilder().addComponents(button));
            } else {
                lastRow.addComponents(button);
            }

            await message.edit({ components: rows });

            return interaction.editReply({
                content: fixedText
                    ? `✅ Botón ${emoji} **${fixedText}** añadido para ${role}.`
                    : `✅ Botón ${emoji} **${role.members.size}** añadido para ${role}. El número se actualizará automáticamente.`,
            });
        }
    }
};
