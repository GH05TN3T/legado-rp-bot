module.exports = async function punish(member, reason, minutes) {

    await member.timeout(
        minutes * 60 * 1000,
        reason
    ).catch(() => {});

};