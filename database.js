const Database = require("better-sqlite3");

// Permite mover la base de datos a un disco persistente definiendo DATABASE_PATH
// en el panel de hosting. Si no se define, usa el archivo local de siempre.
const dbPath = process.env.DATABASE_PATH || "warnings.db";

const db = new Database(dbPath);

// Ajustes recomendados para un bot que corre 24/7:
// WAL mejora la concurrencia y busy_timeout evita errores SQLITE_BUSY
// cuando varias operaciones intentan escribir casi a la vez.
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");

// Compatibilidad con la interfaz de transacciones usada por el bot.
db.transaction = callback => (...args) => {
    db.exec("BEGIN IMMEDIATE");
    try {
        const result = callback(...args);
        db.exec("COMMIT");
        return result;
    } catch (error) {
        db.exec("ROLLBACK");
        throw error;
    }
};

db.prepare(`
CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT,
    userId TEXT,
    moderatorId TEXT,
    reason TEXT,
    date TEXT
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS config (
    guildId TEXT PRIMARY KEY,
    logsChannel TEXT,
    serverUpChannel TEXT
)
`).run();

// Nueva tabla para la Whitelist
db.prepare(`
CREATE TABLE IF NOT EXISTS whitelist (
    guildId TEXT NOT NULL,
    userId TEXT NOT NULL,
    addedBy TEXT NOT NULL,
    date TEXT NOT NULL,
    PRIMARY KEY (guildId, userId)
)
`).run();

// Añadir columnas nuevas automáticamente si no existen
const columns = db.prepare("PRAGMA table_info(config)").all();

if (!columns.some(col => col.name === "serverUpChannel")) {
    db.prepare(`
        ALTER TABLE config
        ADD COLUMN serverUpChannel TEXT
    `).run();
}

const logColumns = [
    "logsMessagesChannel",
    "logsMembersChannel",
    "logsModerationChannel",
    "logsRolesChannel",
    "logsChannelsChannel",
    "logsVoiceChannel",
    "logsDailyVoiceChannel",
    "logsCommandsChannel",
    "logsPaymentsChannel",
    "logsStreamersChannel",
    "logsVerificationChannel",
    "verificationRoleId"
];

for (const column of logColumns) {
    if (!columns.some(col => col.name === column)) {
        db.prepare(`ALTER TABLE config ADD COLUMN ${column} TEXT`).run();
    }
}

db.prepare(`
CREATE TABLE IF NOT EXISTS verifications (
    guildId TEXT NOT NULL,
    userId TEXT NOT NULL,
    username TEXT NOT NULL,
    displayName TEXT,
    accountCreatedAt TEXT NOT NULL,
    joinedAt TEXT,
    verifiedAt TEXT NOT NULL,
    channelId TEXT,
    rolesBefore TEXT,
    PRIMARY KEY (guildId, userId)
)
`).run();

module.exports = db;
// Tiempo acumulado de usuarios en canales de voz.
db.prepare(`
CREATE TABLE IF NOT EXISTS voice_time (
    guildId TEXT NOT NULL,
    userId TEXT NOT NULL,
    totalSeconds INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guildId, userId)
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS voice_sessions (
    guildId TEXT NOT NULL,
    userId TEXT NOT NULL,
    joinedAt INTEGER NOT NULL,
    lastCheckpoint INTEGER,
    PRIMARY KEY (guildId, userId)
)
`).run();

const voiceSessionColumns = db.prepare("PRAGMA table_info(voice_sessions)").all();
if (!voiceSessionColumns.some(col => col.name === "lastCheckpoint")) {
    db.prepare(`ALTER TABLE voice_sessions ADD COLUMN lastCheckpoint INTEGER`).run();
    db.prepare(`UPDATE voice_sessions SET lastCheckpoint = joinedAt WHERE lastCheckpoint IS NULL`).run();
}

// Tiempo diario de Voice y control del aviso de la meta alcanzada.
db.prepare(`
CREATE TABLE IF NOT EXISTS voice_daily (
    guildId TEXT NOT NULL,
    userId TEXT NOT NULL,
    dateKey TEXT NOT NULL,
    totalSeconds INTEGER NOT NULL DEFAULT 0,
    notified INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guildId, userId, dateKey)
)
`).run();

// Configuracion y progreso del minijuego de contador.
db.prepare(`
CREATE TABLE IF NOT EXISTS counting_game (
    guildId TEXT PRIMARY KEY,
    channelId TEXT NOT NULL,
    currentNumber INTEGER NOT NULL DEFAULT 0,
    lastUserId TEXT,
    record INTEGER NOT NULL DEFAULT 0,
    timeoutSeconds INTEGER NOT NULL DEFAULT 300,
    enabled INTEGER NOT NULL DEFAULT 1
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS counting_scores (
    guildId TEXT NOT NULL,
    userId TEXT NOT NULL,
    correctNumbers INTEGER NOT NULL DEFAULT 0,
    failures INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guildId, userId)
)
`).run();

// Configuracion y progreso del juego de palabras encadenadas.
db.prepare(`
CREATE TABLE IF NOT EXISTS word_chain_game (
    guildId TEXT PRIMARY KEY,
    channelId TEXT NOT NULL,
    currentWord TEXT,
    lastUserId TEXT,
    chainLength INTEGER NOT NULL DEFAULT 0,
    record INTEGER NOT NULL DEFAULT 0,
    timeoutSeconds INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS word_chain_used (
    guildId TEXT NOT NULL,
    word TEXT NOT NULL,
    PRIMARY KEY (guildId, word)
)
`).run();

// Ranking independiente del juego de palabras encadenadas.
db.prepare(`
CREATE TABLE IF NOT EXISTS word_chain_scores (
    guildId TEXT NOT NULL,
    userId TEXT NOT NULL,
    correctWords INTEGER NOT NULL DEFAULT 0,
    failures INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (guildId, userId)
)
`).run();

// Tabla editable de sanciones y mensaje publicado en Discord.
db.prepare(`
CREATE TABLE IF NOT EXISTS sanctions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT NOT NULL,
    position INTEGER NOT NULL,
    rule TEXT NOT NULL,
    penalty TEXT NOT NULL
)
`).run();

db.prepare(`
CREATE UNIQUE INDEX IF NOT EXISTS idx_sanctions_guild_position
ON sanctions (guildId, position)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS sanctions_board (
    guildId TEXT PRIMARY KEY,
    channelId TEXT NOT NULL,
    messageId TEXT NOT NULL,
    updatedAt TEXT NOT NULL
)
`).run();

// Solicitudes de whitelist evaluadas por IA y revisadas por el staff.
db.prepare(`
CREATE TABLE IF NOT EXISTS whitelist_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT NOT NULL,
    userId TEXT NOT NULL,
    answers TEXT NOT NULL,
    aiScore INTEGER,
    aiRecommendation TEXT,
    aiSummary TEXT,
    aiStrengths TEXT,
    aiConcerns TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewMessageId TEXT,
    reviewedBy TEXT,
    createdAt TEXT NOT NULL,
    reviewedAt TEXT
)
`).run();

db.prepare(`
CREATE INDEX IF NOT EXISTS idx_wl_applications_user
ON whitelist_applications (guildId, userId, status)
`).run();

// Sugerencias publicadas por la comunidad y sus votos.
db.prepare(`
CREATE TABLE IF NOT EXISTS suggestions (
    messageId TEXT PRIMARY KEY,
    guildId TEXT NOT NULL,
    channelId TEXT NOT NULL,
    authorId TEXT NOT NULL,
    title TEXT NOT NULL,
    details TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    createdAt TEXT NOT NULL
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS suggestion_votes (
    messageId TEXT NOT NULL,
    userId TEXT NOT NULL,
    vote INTEGER NOT NULL,
    PRIMARY KEY (messageId, userId)
)
`).run();
