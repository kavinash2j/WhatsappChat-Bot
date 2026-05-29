const pool = require("../setup/database.setup");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMAIL_REQUEST_MSG =
    "👋 Hi! I'm the group assistant bot.\n\n" +
    "To keep you updated about meetings and events, please reply to *this personal message* with your email address.\n\n" +
    "Just type your email and send — nothing else needed! 📧";

// ─── Helper: promisified db.get ──────────────────────────────────────────────

async function dbGet(sql, params = []) {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows[0];
    } catch (err) {
        throw err;
    }
}

// ─── 1. Send email-request DM to a single member ────────────────────────────
// jid      : member's personal JID  (e.g. "919876543210@s.whatsapp.net")
// groupId  : group JID              (e.g. "120363xxxxxxx@g.us")
// sock     : the Baileys socket

async function sendEmailRequest(sock, jid, groupId) {
    try {
        // Check if this member already has an email saved in the DB
        const existing = await dbGet(
            `SELECT email FROM group_members WHERE jid = ? AND email IS NOT NULL LIMIT 1`,
            [jid]
        );

        if (existing) {
            console.log(`⏭️ Email already on record for ${jid} (${existing.email}) — skipping DM`);
            return;
        }

        // Record the member as pending in the DB (email stays NULL until replied)
        await pool.execute(
            `INSERT IGNORE INTO group_members (jid, groupId) VALUES (?, ?)`,
            [jid, groupId]
        );

        // Send personal DM
        await sock.sendMessage(jid, { text: EMAIL_REQUEST_MSG });
        console.log(`📧 Email request sent to ${jid} for group ${groupId}`);
    } catch (err) {
        console.error(`❌ Failed to send email request to ${jid}:`, err.message);
    }
}

// ─── 2. DM all current members of a group ───────────────────────────────────
// Called when the bot is first added to a group.
// participants : array of JID strings from the groups.upsert event

async function dmAllMembers(sock, groupId, participants) {
    console.log(`📢 Bot added to group ${groupId} — DMing ${participants.length} members`);
    for (const jid of participants) {
        // Skip the bot's own JID and any group JIDs
        if (jid === sock.user?.id || jid.endsWith("@g.us")) continue;
        await sendEmailRequest(sock, jid, groupId);
        // Small delay to avoid rate-limiting
        await new Promise((r) => setTimeout(r, 800));
    }
}

// ─── 3. Handle an incoming personal DM — check if it's an email reply ───────
// Returns true if the message was handled as an email reply, false otherwise.
// msg      : full Baileys message object
// sock     : the Baileys socket

async function handleEmailReply(sock, msg) {
    const remoteJid = msg.key?.remoteJid;
    const text = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        ""
    ).trim();

    // Only care about personal (non-group) DMs
    if (!remoteJid || remoteJid.endsWith("@g.us")) return false;
    if (!text || !EMAIL_REGEX.test(text)) return false;

    // Check if this JID has any pending (email IS NULL) rows in group_members
    let pendingRow;
    try {
        pendingRow = await dbGet(
            `SELECT jid, groupId FROM group_members WHERE jid = ? AND email IS NULL LIMIT 1`,
            [remoteJid]
        );
    } catch (err) {
        console.error("❌ DB lookup error in handleEmailReply:", err.message);
        return false;
    }

    if (!pendingRow) return false; // Not a pending member — let normal flow handle it

    // Save the email
    await pool.execute(
        `UPDATE group_members SET email = ? WHERE jid = ? AND email IS NULL`,
        [text, remoteJid]
    );

    console.log(`✅ Email saved for ${remoteJid}: ${text}`);

    // Confirm back to the user
    await sock.sendMessage(remoteJid, {
        text: `✅ Thanks! Your email *${text}* has been saved.\n\nYou'll receive meeting links and updates here. 🎉`,
    });

    return true; // Mark as handled — caller should NOT forward to /notification
}

// ─── 4. Save/update email manually (e.g. from an API route) ─────────────────

async function saveEmail(jid, groupId, email) {
    await pool.execute(
        `INSERT INTO group_members (jid, groupId, email) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE email = VALUES(email)`,
        [jid, groupId, email]
    );
}

module.exports = { sendEmailRequest, dmAllMembers, handleEmailReply, saveEmail };
