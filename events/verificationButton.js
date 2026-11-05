const { PermissionFlagsBits } = require("discord.js");
const db = require("../database");
const { sendLog } = require("../logger");

function formatDate(date) {
    if (!date) return "No disponible";
    return `<t:${Math.floor(date.getTime() / 1000)}:F> (<t:${Math.floor(date.getTime() / 1000)}:R>)`;
}

module.exports = {
    name: "interactionCreate",

    async execute(interaction) {
        if (!interaction.isButton() || interaction.customId !== "verify_member") return;
        if (!interaction.guild || !interaction.member) return;

        await interaction.deferReply({ ephemeral: true }).catch(() => null);

        try {
            const config = db.prepare(
                "SELECT verificationRoleId FROM config WHERE guildId = ?"
            ).get(interaction.guild.id);

            if (!config?.verificationRoleId) {
                return interaction.editReply("❌ El rol de verificación todavía no está configurado.");
            }

            const role = interaction.guild.roles.cache.get(config.verificationRoleId)
                || await interaction.guild.roles.fetch(config.verificationRoleId).catch(() => null);

            if (!role) {
                return interaction.editReply("❌ El rol configurado ya no existe. Un administrador debe ejecutar `/verificador` otra vez.");
            }

            const member = await interaction.guild.members.fetch(interaction.user.id);
            const botMember = interaction.guild.members.me;

            if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
                return interaction.editReply("❌ El bot no tiene permiso para administrar roles.");
            }

            if (botMember.roles.highest.comparePositionTo(role) <= 0) {
                return interaction.editReply("❌ El rol del bot debe estar por encima del rol de verificado.");
            }

            const alreadyVerified = member.roles.cache.has(role.id);
            const rolesBefore = member.roles.cache
                .filter(r => r.id !== interaction.guild.id)
                .map(r => `${r.name} (${r.id})`)
                .join(", ") || "Ninguno";

            if (!alreadyVerified) {
                await member.roles.add(role, "Verificación automática mediante botón");
            }

            const verifiedAt = new Date();
            db.prepare(`
                INSERT INTO verifications(
                    guildId, userId, username, displayName,
                    accountCreatedAt, joinedAt, verifiedAt,
                    channelId, rolesBefore
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(guildId, userId) DO UPDATE SET
                    username = excluded.username,
                    displayName = excluded.displayName,
                    accountCreatedAt = excluded.accountCreatedAt,
                    joinedAt = excluded.joinedAt,
                    verifiedAt = excluded.verifiedAt,
                    channelId = excluded.channelId,
                    rolesBefore = excluded.rolesBefore
            `).run(
                interaction.guild.id,
                interaction.user.id,
                interaction.user.tag,
                member.displayName,
                interaction.user.createdAt.toISOString(),
                member.joinedAt?.toISOString() || null,
                verifiedAt.toISOString(),
                interaction.channelId,
                rolesBefore
            );

            await sendLog(interaction.guild, {
                type: "verification",
                color: 0x57F287,
                title: alreadyVerified ? "✅ Verificación repetida" : "✅ Usuario verificado",
                user: interaction.user,
                fields: [
                    { name: "Usuario", value: `${interaction.user} (${interaction.user.tag})`, inline: false },
                    { name: "ID", value: interaction.user.id, inline: true },
                    { name: "Nombre visible", value: member.displayName || "No disponible", inline: true },
                    { name: "Cuenta creada", value: formatDate(interaction.user.createdAt), inline: false },
                    { name: "Entró al servidor", value: formatDate(member.joinedAt), inline: false },
                    { name: "Canal", value: `<#${interaction.channelId}>`, inline: true },
                    { name: "Rol entregado", value: `${role}`, inline: true },
                    { name: "Roles anteriores", value: rolesBefore.slice(0, 1024), inline: false }
                ]
            });

            return interaction.editReply(
                alreadyVerified
                    ? `✅ Ya estabas verificado con el rol ${role}. Tu registro fue actualizado.`
                    : `✅ Verificación completada. Recibiste el rol ${role}.`
            );
        } catch (error) {
            console.error("[VERIFICADOR]", error);
            await sendLog(interaction.guild, {
                type: "verification",
                color: 0xED4245,
                title: "❌ Error de verificación",
                description: `No se pudo verificar a ${interaction.user}.`,
                fields: [{ name: "Error", value: String(error.message || error).slice(0, 1024) }]
            }).catch(() => null);
            return interaction.editReply("❌ No se pudo completar la verificación. Revisa los permisos y la posición del rol del bot.");
        }
    }
};
