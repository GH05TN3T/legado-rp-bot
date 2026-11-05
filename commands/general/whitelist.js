const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require("discord.js");

function buildWhitelistModal() {
    const modal = new ModalBuilder()
        .setCustomId("wl_application")
        .setTitle("Whitelist • Legado Roleplay");

    const questions = [
        ["wl_character", "Tu personaje", "Nombre, edad e historia breve de tu personaje.", TextInputStyle.Paragraph, 80, 900],
        ["wl_concepts", "RDM y VDM", "Explica con tus palabras qué son RDM y VDM y da un ejemplo.", TextInputStyle.Paragraph, 80, 900],
        ["wl_life", "Valoración de vida", "¿Qué harías si dos personas armadas te apuntan durante un robo?", TextInputStyle.Paragraph, 80, 900],
        ["wl_role", "Situación de rol", "Un jugador rompe rol y te insulta. ¿Cómo reaccionas dentro y fuera del rol?", TextInputStyle.Paragraph, 80, 900],
        ["wl_motivation", "Tu motivación", "¿Por qué quieres entrar a Legado Roleplay y qué aportarías?", TextInputStyle.Paragraph, 60, 900]
    ];

    for (const [id, label, placeholder, style, min, max] of questions) {
        modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId(id)
                .setLabel(label)
                .setPlaceholder(placeholder)
                .setStyle(style)
                .setMinLength(min)
                .setMaxLength(max)
                .setRequired(true)
        ));
    }

    return modal;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("whitelist")
        .setDescription("Realizar la entrevista de whitelist de Legado Roleplay."),

    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: "❌ Este comando solo funciona dentro de Legado Roleplay.", ephemeral: true });
        }

        await interaction.showModal(buildWhitelistModal());
    },

    buildWhitelistModal
};
