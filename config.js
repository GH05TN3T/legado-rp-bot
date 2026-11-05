"use strict";

function env(name, fallback = "") {
    const value = process.env[name];
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

module.exports = Object.freeze({
    clientId: env("DISCORD_CLIENT_ID"),
    boostChannelId: env("BOOST_CHANNEL_ID"),
    voiceTrackedRoleId: env("VOICE_TRACKED_ROLE_ID"),
    dailyVoiceGoalSeconds: Number(env("DAILY_VOICE_GOAL_SECONDS", "7200")),
    dailyVoiceTimezone: env("DAILY_VOICE_TIMEZONE", "America/Santo_Domingo"),
    whitelistReviewChannelId: env("WHITELIST_REVIEW_CHANNEL_ID"),
    whitelistRoleId: env("WHITELIST_ROLE_ID")
});

