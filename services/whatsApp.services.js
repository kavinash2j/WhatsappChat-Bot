const axios = require("axios");

// ─── Existing helper ────────────────────────────────────────────────────────

function msgStg(eventData) {
    const start = new Date(eventData.start.dateTime);
    const end = new Date(eventData.end.dateTime);
    const duration = Math.round((end - start) / (1000 * 60));

    const msg_stur = `📅 Date: ${start.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}\n🕗 Time: ${start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}\n⏳ Duration: ${duration} minutes\n📍 Platform: Google Meet\n🔗 Join Here: ${eventData.hangoutLink || (eventData.conferenceData?.entryPoints?.find(e => e.entryPointType === "video")?.uri)} `;
    return msg_stur;
}

// ─── Method 1 : Call the AI chatbot ─────────────────────────────────────────
// Throws on network/server error so the controller can handle it gracefully.

async function getAiResponse(message) {
    const response = await axios.post(
        `${process.env.Backend}/ai-chatbot`,
        { message },
        { timeout: 45000 }
    );

    if (!response || response.status !== 200) {
        console.log("response not came from the server");
        throw new Error("AI chatbot returned a non-200 response");
    }

    return response.data; // botData
}

// ─── Method 2 : Schedule a Meeting ──────────────────────────────────────────
// Calls Google Calendar endpoint, formats confirmation, sends reply via safeReply.

async function scheduleMeeting(botData, message, safeReply, groupId) {
    let meetingSchedule;
    try {
        meetingSchedule = await axios.post(
            `${process.env.Backend}/addevent`,
            { attribute: botData, message, groupId },
            { timeout: 45000 }
        );
    } catch (calErr) {
        console.error("❌ Google Calendar error:", calErr.message);
        const calErrData = calErr.response?.data;
        if (calErrData?.message) {
            await safeReply(calErrData.message);
        } else {
            await safeReply("Sorry, I wasn't able to schedule the meeting right now. Please try again after some time.");
        }
        return;
    }

    // Non-throw error body from the calendar route
    if (meetingSchedule.data?.error) {
        await safeReply(
            meetingSchedule.data.message ||
            "Sorry, I wasn't able to schedule the meeting right now. Please try again after some time."
        );
        return;
    }

    const eventData = meetingSchedule.data.data;
    const msg_stur = msgStg(eventData);
    await safeReply(msg_stur);
    console.log("✅ Meeting scheduled successfully");
}

// ─── Method 3 : Dispatch bot response by type ───────────────────────────────
// Routes the AI reply (meeting / question / error / service_error) to the
// correct handler so the controller stays clean.

async function dispatchBotResponse(botData, message, safeReply, groupId) {

    // LLM-level service error
    if (botData.type === "service_error") {
        console.log("LLM service error:", botData.answer);
        await safeReply(botData.answer);
        return;
    }

    // Schedule a meeting
    if (botData.type === "meeting") {
        await scheduleMeeting(botData, message, safeReply, groupId);
        return;
    }

    // Answer a question
    if (botData.type === "question") {
        console.log("AI-chatBot :- " + botData.answer);
        await safeReply(botData.answer);
        console.log("✅ Answer sent successfully");
        return;
    }

    // Bot reported an input error (missing details etc.)
    if (botData.type === "error") {
        console.log("AI-chatBot-error :- " + botData.answer);
        await safeReply(botData.answer);
        console.log("✅ Error message sent to user");
        return;
    }

    // Unknown response type — fallback
    console.log("⚠️ Unknown bot response type:", botData.type);
    await safeReply("Sorry, I'm not able to help with that right now. Please try again after some time.");
}

module.exports = { msgStg, getAiResponse, scheduleMeeting, dispatchBotResponse };