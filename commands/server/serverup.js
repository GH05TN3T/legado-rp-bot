const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    PermissionFlagsBits
} = require("discord.js");

const db = require("../../database");

const SERVER_UP_ROLE = "1324969538516684892";
const MEMBER_ROLE = "1323178557106557018";
const JOIN_URL = "https://cfx.re/join/bagxgl";
const ALTERNATIVE_URL = "https://extremorp-connect.cdn-playflare.net/";
const SERVER_UP_GIF =
    "https://r2.fivemanage.com/UbZoU5R70e2Tv7V4SHmo1/SERVERONSUAFASTORE.gif?v=2";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("serverup")
        .setDescription("Anuncia que el servidor está abierto."),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const hasRole = interaction.member?.roles?.cache?.has(SERVER_UP_ROLE);
        const canManage = interaction.memberPermissions?.has(
            PermissionFlagsBits.ManageGuild
        );

        if (!hasRole && !canManage) {
            return interaction.editReply("❌ Sin permiso.");
        }

        const config = db.prepare(`
            SELECT serverUpChannel
            FROM config
            WHERE guildId = ?
        `).get(interaction.guild.id);

        if (!config?.serverUpChannel) {
            return interaction.editReply("❌ Usa **/setserverup** primero.");
        }

        const channel = await interaction.guild.channels
            .fetch(config.serverUpChannel)
            .catch(() => null);

        if (!channel?.isTextBased() || typeof channel.send !== "function") {
            return interaction.editReply("❌ Canal no disponible.");
        }

        const permissions = channel.permissionsFor(interaction.guild.members.me);
        const required = [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks
        ];

        if (!permissions || !required.every(permission => permissions.has(permission))) {
            return interaction.editReply("❌ Faltan permisos en el canal.");
        }

        const iconURL = interaction.guild.iconURL({ extension: "png", size: 256 });

        const embed = new EmbedBuilder()
            .setColor("#42B9FF")
            .setAuthor({ name: "LEGADO ROLEPLAY", iconURL })
            .setTitle("🟢 CIUDAD ABIERTA")
            .setDescription("Entra y comienza tu historia.")
            .addFields({
                name: "Conexión",
                value: "`cfx.re/join/bagxgl`"
            })
            .setImage(
                "https://r2.fivemanage.com/UbZoU5R70e2Tv7V4SHmo1/SERVERONSUAFASTORE.gif"
            )
            .setImage(SERVER_UP_GIF)
            .setFooter({ text: "Legado Roleplay • Construye tu legado" })
            .setTimestamp();

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel("ENTRAR")
                .setEmoji("🚀")
                .setStyle(ButtonStyle.Link)
                .setURL(JOIN_URL)
                .setURL(JOIN_URL),
            new ButtonBuilder()
                .setLabel("CONEXIÓN ALTERNATIVA")
                .setEmoji("🔗")
                .setStyle(ButtonStyle.Link)
                .setURL(ALTERNATIVE_URL)
        );

        try {
            await channel.send({
                content: `<@&${MEMBER_ROLE}> ¡La ciudad está abierta!`,
                allowedMentions: { roles: [MEMBER_ROLE] },
                embeds: [embed],
                components: [buttons]
            });
        } catch (error) {
            console.error("[SERVERUP]", error);
            return interaction.editReply("❌ No se pudo publicar.");
        }

        return interaction.editReply(`✅ Publicado en ${channel}.`);
    }
};
