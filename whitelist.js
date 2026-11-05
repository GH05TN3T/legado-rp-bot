const db = require("./database");

function isWhitelisted(guildId, userId) {
    return !!db.prepare(
        "SELECT 1 FROM whitelist WHERE guildId = ? AND userId = ?"
    ).get(guildId, userId);
}

function add(guildId, userId, addedBy) {
    db.prepare(`
        INSERT OR REPLACE INTO whitelist
        (guildId, userId, addedBy, date)
        VALUES (?, ?, ?, ?)
    `).run(
        guildId,
        userId,
        addedBy,
        new Date().toISOString()
    );
}

function remove(guildId, userId) {
    db.prepare(
        "DELETE FROM whitelist WHERE guildId = ? AND userId = ?"
    ).run(guildId, userId);
}

function list(guildId) {
    return db.prepare(
        "SELECT * FROM whitelist WHERE guildId = ?"
    ).all(guildId);
}

module.exports = {
    isWhitelisted,
    add,
    remove,
    list
};