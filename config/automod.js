module.exports = {

    enabled: true,

    punishments: {

        warnings: 3,

        timeout: 10 // minutos

    },

    spam: {

        enabled: true,

        maxMessages: 5,

        interval: 5000

    },

    links: {

        enabled: true,

        channels: [
            "1362160504528961567", // Canal 1
            "1374069220974792724"  // Canal 2
        ],

        whitelist: [
            "cfx.re",
            "discord.gg/extremorp"
        ]

    },

    invites: {

        enabled: true,

        whitelist: [
            "discord.gg/extremorp"
        ]

    },

    everyone: {

        enabled: true

    },

    massMention: {

        enabled: true,

        limit: 5

    },

    ghostPing: {

        enabled: true

    },

    caps: {

        enabled: true,

        percent: 80,

        minimumLength: 15

    },

    emojis: {

        enabled: true,

        limit: 10

    },

    badWords: {

        enabled: true,

        words: [
            // Agrega palabras aquí
        ]

    },

    scam: {

        enabled: true

    }

};