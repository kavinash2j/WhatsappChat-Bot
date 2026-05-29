const axios = require("axios")
const qrcode = require("qrcode-terminal")
const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys")
const pino = require("pino")
const dbgr = require("debug")("development:chatbot")
const util = require("util")
const pool = require("./database.setup")
const { dmAllMembers, sendEmailRequest, handleEmailReply } = require("../services/group.services")

let sock
let isBotOnline = false
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 10

// Queue to hold messages received while bot was offline
const pendingMessageQueue = []

function getBotStatus() {
    return isBotOnline
}

// Drain the pending queue once bot comes back online
async function drainPendingQueue() {
    if (pendingMessageQueue.length === 0) return
    console.log(`📬 Draining ${pendingMessageQueue.length} pending message(s) from offline queue...`)
    while (pendingMessageQueue.length > 0) {
        const { remoteJid, originalText, originalMsg } = pendingMessageQueue.shift()
        try {
            // Quote the original message so the user knows which request the bot is replying to
            await sock.sendMessage(remoteJid, {
                text: `Hey! Sorry I was away for a bit and missed your message. I'm back now — could you please send it again?`
            }, { quoted: originalMsg })
            console.log(`✅ Sent offline-recovery reply to ${remoteJid}`)
        } catch (err) {
            console.error(`❌ Failed to send offline-recovery reply to ${remoteJid}:`, err.message)
        }
    }
}

async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState("auth_info")
    const { version } =
        await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: "silent" }),
        printQRInTerminal: true, // MUST be true
        browser: ["Chrome", "Desktop", "1.0.0"],
    })

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {

        const { connection, qr, lastDisconnect } = update;
        console.log("update ", update);
        if (qr) qrcode.generate(qr, { small: true });

        if (connection === "open") {
            isBotOnline = true
            reconnectAttempts = 0
            console.log("✅ WhatsApp Bot connected!")
            // Reply to any messages that came in while offline
            await drainPendingQueue()
        }

        if (connection === "close") {
            isBotOnline = false
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log("❌ Connection closed. Reason:", reason, lastDisconnect?.error?.message);

            const isLoggedOut = reason === 401;

            if (isLoggedOut) {
                console.log("🚫 Logged out. Delete auth_info and rescan QR.")
            } else if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                // Exponential backoff: 2s, 4s, 8s ... up to ~60s
                const delay = Math.min(2000 * Math.pow(2, reconnectAttempts), 60000)
                reconnectAttempts++
                console.log(`🔄 Reconnecting in ${delay / 1000}s... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`)
                setTimeout(() => startBot(), delay)
            } else {
                console.log(`🛑 Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Please restart the server manually.`)
            }
        }
    });


    sock.ev.on("messages.upsert", async (m) => {

        const msg = m.messages[0];

        if (!msg.key.fromMe && msg.message && m.type == 'notify') {

            const text =
                msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text ||
                msg.message?.imageMessage?.caption ||
                msg.message?.videoMessage?.caption ||
                msg.message?.botInvokeMessage?.message?.extendedTextMessage?.text ||
                "";

            const remoteJid = msg.key.remoteJid

            // --- Skip empty or whitespace-only messages ---
            if (!text || text.trim() === "") {
                dbgr("⏭️ Skipping empty message from", remoteJid)
                return
            }

            dbgr("📩 Message received:", text);

            // If the bot is currently offline/reconnecting, queue the message
            if (!isBotOnline) {
                console.log(`📥 Bot offline — queuing message from ${remoteJid}: "${text}"`)
                // Store full msg so we can send a quoted reply when we come back
                pendingMessageQueue.push({ remoteJid, originalText: text, originalMsg: msg })
                return
            }

            // --- Intercept personal DMs that look like an email reply ---
            // If the message is a plain email address from a pending group member,
            // save it and stop — don't forward to /notification
            try {
                const wasEmailReply = await handleEmailReply(sock, msg)
                if (wasEmailReply) return
            } catch (emailErr) {
                console.error("❌ handleEmailReply error (non-fatal):", emailErr.message)
                // continue to normal /notification flow
            }

            try {
                await axios.post("http://localhost:3000/notification", {
                    msg,
                }, { timeout: 60000 })
            } catch (err) {
                console.error("❌ Failed to forward message to /notification:", err.message)
                // Send a quoted error reply so the user knows which message failed
                try {
                    await sock.sendMessage(remoteJid, {
                        text: "Sorry, I'm not available right now. Please try again after some time."
                    }, { quoted: msg })
                } catch (sendErr) {
                    console.error("❌ Could not send error reply:", sendErr.message)
                }
            }
        }
    })

    // ── Bot is added to a NEW group ──────────────────────────────────────────
    // groups.upsert fires when the bot joins a group for the first time.
    // We save the group to DB and DM every current participant asking for email.
    sock.ev.on("groups.upsert", async (groupList) => {
        try {
            for (const group of groupList) {
                const groupId = group.id
                const groupName = group.subject || "Unknown Group"

                console.log(`👥 Bot added to group: "${groupName}" (${groupId})`)

                // Persist group
                await pool.execute(`INSERT IGNORE INTO \`groups\` (groupId, groupName) VALUES (?, ?)`, [groupId, groupName])

                // participants may be objects { id, admin } or plain strings
                const participants = (group.participants || []).map((p) =>
                    typeof p === "string" ? p : p?.id
                ).filter(Boolean)

                await dmAllMembers(sock, groupId, participants)
            }
        } catch (err) {
            console.error("❌ groups.upsert handler error (non-fatal):", err.message)
        }
    })

    // ── New member(s) added to a group AFTER the bot joined ──────────────────
    // group-participants.update fires on add / remove / promote / demote.
    // We only care about the 'add' action.
    sock.ev.on("group-participants.update", async (update) => {
        try {
            const { id: groupId, participants, action } = update

            if (action !== "add") return

            console.log(`➕ New member(s) added to group ${groupId}:`, participants)

            for (const p of participants) {
                // participants can be objects { id, admin } or plain strings
                const jid = typeof p === "string" ? p : p?.id
                if (!jid || typeof jid !== "string") continue
                if (jid === sock.user?.id || jid.endsWith("@g.us")) continue
                await sendEmailRequest(sock, jid, groupId)
                await new Promise((r) => setTimeout(r, 800))
            }
        } catch (err) {
            console.error("❌ group-participants.update handler error (non-fatal):", err.message)
        }
    })

    sock.ev.on('chats.upsert', async (update) => {

        // const myJid = sock.user.id // your own WhatsApp JID
        const data = update[0];
        console.log("hello", update);
        if (data.id.endsWith('@g.us')) {
            await pool.execute(`INSERT IGNORE INTO \`groups\` (groupId, groupName) VALUES (?, ?)`, [data.id, data.name || "Unknown Group"])
        }

        // if (update.action === 'add' && update.participants.includes(myJid)) {
        //     console.log(`✅ You were added to a new group`)

        //     // Example: send an intro message
        //     // await sock.sendMessage(update.id, { text: "Hey everyone 👋, thanks for adding me!" })
        // }
    })

}
module.exports = { startBot, getSocket: () => sock, getBotStatus }