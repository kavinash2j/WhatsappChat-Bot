const { google } = require("googleapis");
const fs = require("fs");
const { oAuth2Client } = require("../setup/calender.setup");
const pool = require("../setup/database.setup");

const getEventsHandler = async (req, res) => {
    try {
        oAuth2Client.setCredentials(JSON.parse(fs.readFileSync("tokens.json")));
        const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

        const result = await calendar.events.list({
            calendarId: "primary",
            maxResults: 10,
            orderBy: "startTime",
            singleEvents: true,
        });

        res.json(result.data.items);
    } catch (error) {
        console.error("❌ Error in /events route:", error.message);
        const status = error?.code || error?.response?.status;
        if (status === 401) {
            return res.status(401).json({ error: "calendar_auth_error", message: "Google Calendar authentication expired. Please re-authorize." });
        }
        return res.status(503).json({ error: "calendar_unavailable", message: "Google Calendar is currently unavailable. Please try again later." });
    }
};

const addEventHandler = async (req, res) => {
    try {
        oAuth2Client.setCredentials(JSON.parse(fs.readFileSync("tokens.json")));
        const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
        const { attribute, groupId } = req.body;

        let attendees = [
            { "email": "avinash.22310161@viit.ac.in" },
        ];

        // Fetch group members' emails if a groupId was provided
        if (groupId) {
            try {
                // Here we use pool directly as imported above
                const [rows] = await pool.execute(
                    `SELECT email FROM group_members WHERE groupId = ? AND email IS NOT NULL`,
                    [groupId]
                );
                for (const row of rows) {
                    if (row.email && row.email !== "avinash.22310161@viit.ac.in") {
                        attendees.push({ "email": row.email });
                    }
                }
            } catch (dbErr) {
                console.error("❌ Error fetching group emails:", dbErr.message);
            }
        }

        const event = {
            "summary": `${attribute.title}`,
            "location": "Zoom / Google Meet",
            "description": `${attribute.description}`,
            "start": {
                "dateTime": `${attribute.start.dateTime}`,
                "timeZone": "Asia/Kolkata"
            },
            "end": {
                "dateTime": `${attribute.end.dateTime}`,
                "timeZone": "Asia/Kolkata"
            },
            "attendees": attendees,
            "conferenceData": {
                "createRequest": { "requestId": "meet123" }
            },
            "reminders": {
                "useDefault": false,
                "overrides": [
                    { "method": "email", "minutes": 30 },
                    { "method": "popup", "minutes": 10 }
                ]
            },
            "colorId": "1",
            "visibility": "default",
            "guestsCanInviteOthers": false,
            "guestsCanModify": false,
            "guestsCanSeeOtherGuests": true
        };

        let insertedEvent;
        try {
            const insertResponse = await calendar.events.insert({
                calendarId: "primary",
                resource: event,
                conferenceDataVersion: 1,
                sendUpdates: "all",
            });
            insertedEvent = insertResponse.data;
            console.log("✅ Calendar event created:", insertedEvent.htmlLink);
        } catch (insertErr) {
            console.error("❌ calendar.events.insert failed:", insertErr.response?.data || insertErr.message);
            throw insertErr; // bubble up to outer catch
        }

        res.json({ data: insertedEvent });

    } catch (error) {
        console.error("❌ Error in /addevent route:", error.message);
        const status = error?.code || error?.response?.status;

        if (status === 401) {
            return res.status(401).json({
                error: "calendar_auth_error",
                message: "Sorry, I wasn't able to schedule the meeting this time. Please try again after some time."
            });
        }

        if (status === 429 || error?.message?.includes("quota")) {
            return res.status(429).json({
                error: "calendar_quota_exceeded",
                message: "Sorry, I'm a little busy right now. Please give me a moment and try scheduling again."
            });
        }

        return res.status(503).json({
            error: "calendar_unavailable",
            message: "Sorry, I wasn't able to schedule the meeting right now. Please try again after some time."
        });
    }
};

module.exports = { getEventsHandler, addEventHandler };
