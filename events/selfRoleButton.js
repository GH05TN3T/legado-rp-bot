const {
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    MessageFlags
} = require("discord.js");
const { sendLog } = require("../logger");

function isSelfRoleButton(customId = "") {
    return customId.startsWith("selfrole:") || customId.startsWith("selfrolecount:");
}

function getRoleId(customId = "") {
    return customId.split(":")[1];
}

async function refreshCountButton(interaction, roleId) {
    if (!interaction.customId.startsWith("selfrolecount:")) return;

    await interaction.guild.members.fetch().catch(() => null);
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) return;

    const rows = interaction.message.components.map(row => {
        const newRow = new ActionRowBuilder();

        for (const component of row.components) {
            const button = ButtonBuilder.from(component);

            if (component.data.custom_id === `selfrolecount:${roleId}`) {
                button.setLabel(String(role.members.size));
            }

            newRow.addComponents(button);
        }

        return newRow;
    });

    await interaction.message.edit({ components: rows }).catch(error => {
        console.error("[SELF ROLE COUNT UPDATE]", error);
    });
}

module.exports = {
    name: "interactionCreate",

    async execute(interaction) {
        if (!interaction.isButton() || !isSelfRoleButton(interaction.customId)) return;
        if (!interaction.guild) return;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => null);

        try {
            const roleId = getRoleId(interaction.customId);
            if (!/^\d{17,20}$/.test(roleId || "")) {
                return interaction.editReply("❌ Este botón de rol no es válido.");
            }

            const role = interaction.guild.roles.cache.get(roleId)
                || await interaction.guild.roles.fetch(roleId).catch(() => null);
            if (!role) return interaction.editReply("❌ Ese rol ya no existe.");

            const member = await interaction.guild.members.fetch(interaction.user.id);
            const botMember = interaction.guild.members.me;

            if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
                return interaction.editReply("❌ El bot no tiene permiso para administrar roles.");
            }

            if (role.managed || botMember.roles.highest.comparePositionTo(role) <= 0) {
                return interaction.editReply("❌ No puedo administrar ese rol. Coloca el rol del bot por encima.");
            }

            const hadRole = member.roles.cache.has(role.id);

            if (hadRole) {
                await member.roles.remove(role, "Rol removido mediante botón de autorol");
            } else {
                await member.roles.add(role, "Rol añadido mediante botón de autorol");
            }

            await refreshCountButton(interaction, role.id);

            await sendLog(interaction.guild, {
                type: "roles",
                color: hadRole ? 0xED4245 : 0x57F287,
                title: hadRole ? "➖ Rol removido por botón" : "➕ Rol añadido por botón",
                user: interaction.user,
                fields: [
                    { name: "Usuario", value: `${interaction.user} (${interaction.user.id})`, inline: false },
                    { name: "Rol", value: `${role} (${role.id})`, inline: false },
                    { name: "Canal", value: `${interaction.channel}`, inline: true }
                ]
            }).catch(() => null);

            return interaction.editReply(
                hadRole
                    ? `➖ Se te quitó el rol ${role}.`
                    : `✅ Recibiste el rol ${role}.`
            );
        } catch (error) {
            console.error("[SELF ROLE BUTTON]", error);
            return interaction.editReply("❌ No pude cambiar el rol. Revisa los permisos y la posición del rol del bot.");
        }
    }
};
