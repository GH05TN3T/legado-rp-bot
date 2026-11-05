const db = require("../database");
const config = require("../config");

const TIMEZONE = config.dailyVoiceTimezone || "America/Santo_Domingo";

function getDateKey(timestamp) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date(timestamp));
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
}

function addDailySeconds(guildId, userId, dateKey, seconds) {
    if (seconds <= 0) return;
    db.prepare(`
        INSERT INTO voice_daily (guildId, userId, dateKey, totalSeconds)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(guildId, userId, dateKey)
        DO UPDATE SET totalSeconds = totalSeconds + excluded.totalSeconds
    `).run(guildId, userId, dateKey, seconds);
}

function checkpointSession(guildId, userId, timestamp = Date.now()) {
    const session = db.prepare(`
        SELECT joinedAt, COALESCE(lastCheckpoint, joinedAt) AS lastCheckpoint
        FROM voice_sessions WHERE guildId = ? AND userId = ?
    `).get(guildId, userId);

    if (!session) return null;

    let cursor = session.lastCheckpoint;
    const end = Math.max(cursor, timestamp);
    let addedSeconds = 0;

    // Se divide en fragmentos cortos para asignar correctamente el tiempo
    // si una sesión cruza la medianoche dominicana.
    while (cursor + 1000 <= end) {
        const next = cursor + 1000;
        const seconds = Math.max(0, Math.floor((next - cursor) / 1000));
        addDailySeconds(guildId, userId, getDateKey(cursor), seconds);
        addedSeconds += seconds;
        cursor = next;
    }

    if (addedSeconds > 0) {
        db.prepare(`
            INSERT INTO voice_time (guildId, userId, totalSeconds)
            VALUES (?, ?, ?)
            ON CONFLICT(guildId, userId)
            DO UPDATE SET totalSeconds = totalSeconds + excluded.totalSeconds
        `).run(guildId, userId, addedSeconds);
    }

    const advancedCheckpoint = session.lastCheckpoint + (addedSeconds * 1000);
    db.prepare(`UPDATE voice_sessions SET lastCheckpoint = ? WHERE guildId = ? AND userId = ?`)
        .run(advancedCheckpoint, guildId, userId);

    return { joinedAt: session.joinedAt, addedSeconds };
}

function startSession(guildId, userId, timestamp = Date.now()) {
    db.prepare(`
        INSERT INTO voice_sessions (guildId, userId, joinedAt, lastCheckpoint)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(guildId, userId) DO UPDATE SET
            joinedAt = excluded.joinedAt,
            lastCheckpoint = excluded.lastCheckpoint
    `).run(guildId, userId, timestamp, timestamp);
}

function endSession(guildId, userId, timestamp = Date.now()) {
    const session = db.prepare(`
        SELECT joinedAt FROM voice_sessions WHERE guildId = ? AND userId = ?
    `).get(guildId, userId);

    if (!session) return 0;

    const seconds = Math.max(0, Math.floor((timestamp - session.joinedAt) / 1000));
    const transaction = db.transaction(() => {
        checkpointSession(guildId, userId, timestamp);
        db.prepare(`DELETE FROM voice_sessions WHERE guildId = ? AND userId = ?`)
            .run(guildId, userId);
    });

    transaction();
    return seconds;
}

function getSessionStart(guildId, userId) {
    const session = db.prepare(`
        SELECT joinedAt FROM voice_sessions WHERE guildId = ? AND userId = ?
    `).get(guildId, userId);

    return session?.joinedAt || null;
}

function getTotalSeconds(guildId, userId, timestamp = Date.now()) {
    const saved = db.prepare(`
        SELECT totalSeconds FROM voice_time WHERE guildId = ? AND userId = ?
    `).get(guildId, userId)?.totalSeconds || 0;

    const session = db.prepare(`
        SELECT COALESCE(lastCheckpoint, joinedAt) AS lastCheckpoint
        FROM voice_sessions WHERE guildId = ? AND userId = ?
    `).get(guildId, userId);

    const current = session
        ? Math.max(0, Math.floor((timestamp - session.lastCheckpoint) / 1000))
        : 0;

    return saved + current;
}

function getTop(guildId, limit = 10, timestamp = Date.now()) {
    const rows = db.prepare(`
        SELECT userId, totalSeconds FROM voice_time WHERE guildId = ?
    `).all(guildId);

    const sessions = db.prepare(`
        SELECT userId, COALESCE(lastCheckpoint, joinedAt) AS lastCheckpoint
        FROM voice_sessions WHERE guildId = ?
    `).all(guildId);

    const totals = new Map(rows.map(row => [row.userId, row.totalSeconds]));
    for (const session of sessions) {
        const current = Math.max(0, Math.floor((timestamp - session.lastCheckpoint) / 1000));
        totals.set(session.userId, (totals.get(session.userId) || 0) + current);
    }

    return [...totals.entries()]
        .map(([userId, totalSeconds]) => ({ userId, totalSeconds }))
        .sort((a, b) => b.totalSeconds - a.totalSeconds)
        .slice(0, limit);
}

function formatDuration(totalSeconds) {
    totalSeconds = Math.max(0, Math.floor(totalSeconds));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (days) parts.push(`${days} día${days === 1 ? "" : "s"}`);
    if (hours) parts.push(`${hours} hora${hours === 1 ? "" : "s"}`);
    if (minutes) parts.push(`${minutes} minuto${minutes === 1 ? "" : "s"}`);
    if (seconds || parts.length === 0) parts.push(`${seconds} segundo${seconds === 1 ? "" : "s"}`);
    return parts.join(", ");
}

function cancelSession(guildId, userId) {
    db.prepare(`DELETE FROM voice_sessions WHERE guildId = ? AND userId = ?`).run(guildId, userId);
}

function resetSessions() {
    db.prepare(`DELETE FROM voice_sessions`).run();
}

function checkpointAll(timestamp = Date.now()) {
    const sessions = db.prepare(`SELECT guildId, userId FROM voice_sessions`).all();
    for (const session of sessions) checkpointSession(session.guildId, session.userId, timestamp);
}

function getDailyGoalCandidates(goalSeconds, timestamp = Date.now()) {
    checkpointAll(timestamp);
    const dateKey = getDateKey(timestamp);
    return db.prepare(`
        SELECT guildId, userId, dateKey, totalSeconds
        FROM voice_daily
        WHERE dateKey = ? AND totalSeconds >= ? AND notified = 0
    `).all(dateKey, goalSeconds);
}

function markDailyGoalNotified(guildId, userId, dateKey) {
    db.prepare(`
        UPDATE voice_daily SET notified = 1
        WHERE guildId = ? AND userId = ? AND dateKey = ?
    `).run(guildId, userId, dateKey);
}

module.exports = {
    startSession, endSession, getSessionStart, getTotalSeconds, getTop,
    formatDuration, cancelSession, resetSessions, checkpointAll,
    getDailyGoalCandidates, markDailyGoalNotified, getDateKey
};
