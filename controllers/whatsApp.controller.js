const { generateToken } = require("../middlewares/auth_middleware");
const pool = require("../setup/database.setup");
const sqliteDb = require("../setup/sqlite.setup");
const { getSocket } = require("../setup/whatsapp.setup");
const axios = require("axios");
const { getAiResponse, dispatchBotResponse } = require("../services/whatsApp.services");

async function notificationHandler(req, res) {
    // console.log("notification route trigger");
    try {
        const { msg } = req.body;
        const message =
            msg?.message?.conversation ||
            msg?.message?.extendedTextMessage?.text ||
            msg?.message?.botInvokeMessage?.message?.extendedTextMessage?.text;

        const remoteJid = msg?.key?.remoteJid;

        console.log(remoteJid);

        // --- Guard: ignore empty or whitespace-only messages ---
        if (!message || message.trim() === "") {
            console.log("⏭️ Empty message received from", remoteJid, "- ignoring.");
            return res.sendStatus(200);
        }

        // Helper: send a WhatsApp reply, quoting the original message
        // so in busy group chats the user knows which message the bot is answering
        const safeReply = async (text) => {
            try {
                const sock = getSocket();
                if (sock) {
                    // { quoted: msg } makes the reply appear as a thread reply to the original message
                    await sock.sendMessage(remoteJid, { text }, { quoted: msg });
                } else {
                    await axios.post(`${process.env.Backend}/sendmessage`, {
                        number: remoteJid,
                        message: text,
                    });
                }
            } catch (replyErr) {
                console.error("❌ Failed to send reply to user:", replyErr.message);
            }
        };

        // Update auth tokens for downstream services
        let token = generateToken(message);
        sqliteDb.run(`UPDATE Token SET token = ? WHERE name = 'authLlm'`, [token]);
        sqliteDb.run(`UPDATE Token SET token = ? WHERE name = 'authSched'`, [token]);

        if (remoteJid?.endsWith("@lid")) {
            // Personal number — currently only logged
            console.log("message came from personal number", remoteJid, " ", message.split("how"));
        }

        else if (remoteJid.endsWith("@g.us") && message.startsWith(`@${process.env.MOBNO}`)) {

            console.log("message came from the group");

            const text =
                message
                    .split(`@${process.env.MOBNO}`)[1]
                    ?.trimStart() || "";
                    
            console.log("user :- " + text);

            // --- Guard: @mention with no actual content ---
            if (!text || text.trim() === "") {
                console.log("⏭️ Empty @mention received — sending prompt reply");
                await safeReply(
                    "Hey! Looks like you called me but didn't say anything. What can I help you with?\n\nI can:\n- Schedule a meeting\n- Answer your questions"
                );
                return res.sendStatus(200);
            }

            // --- Call AI chatbot (method 1) ---
            let botData;
            try {
                botData = await getAiResponse(message);
            } catch (aiErr) {
                console.error("❌ AI chatbot request failed:", aiErr.message);
                const errData = aiErr.response?.data;
                if (errData?.answer) {
                    await safeReply(errData.answer);
                } else {
                    await safeReply("Sorry, I'm not available right now. Please try again after some time.");
                }
                return res.sendStatus(200);
            }

            // --- Dispatch response by type (methods 2 & 3) ---
            await dispatchBotResponse(botData, message, safeReply, remoteJid);
        }

        else {
            console.log("message is not start with @task");
            console.log(message);
        }

        res.sendStatus(200);
    }
    catch (error) {
        console.error("❌ Unhandled error in /notification route:", error.message);
        // Don't crash — try to send a fallback reply
        try {
            const sock = getSocket();
            if (sock && req.body?.msg?.key?.remoteJid) {
                await sock.sendMessage(req.body.msg.key.remoteJid, {
                    text: "Sorry, I'm not available right now. Please try again after some time.",
                });
            }
        } catch (_) { }
        res.sendStatus(200);
    }
}

async function sendMessageHandler(req, res) {
    try {
        const { number, message } = req.body;
        console.log("📨 Sending:", number);

        const sock = getSocket();
        if (!sock) {
            return res.status(500).send({ message: "Socket is not connected" });
        }

        await sock.sendMessage(number, { text: message });

        res.send({ status: " Message sent!" });
    } catch (error) {
        console.error(" Error in /sendmessage:", error);
        res.status(500).send({ error: error.message });
    }
}

module.exports = { notificationHandler, sendMessageHandler };
