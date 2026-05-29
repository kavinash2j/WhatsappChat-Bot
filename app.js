const dotenv = require("dotenv").config();
const express = require("express");
const app = express();
const { startBot, getSocket } = require("./setup/whatsapp.setup");
const cookie_pareser = require("cookie-parser");
const { generateToken } = require("./middlewares/auth_middleware");
const OpenAI = require("openai");
const axios = require("axios");
const llm = require("./Routes/llm.routes");
const whatsApp = require("./Routes/whatsApp.routes")
const meetSchedule = require("./Routes/meetSchedule.routes");
const calendar = require("./setup/calender.setup")
const gmail = require("./Routes/gmail.routes");
const { initGmail } = require("./setup/gmail.setup");
// const { db } = require("./setup/database.setup");
const { createTables } = require("./utils/db");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookie_pareser());
app.use('/', llm.Route);
app.use('/', whatsApp.Route);
app.use('/', meetSchedule.Route);
app.use('/', calendar.Route);
app.use('/', gmail.Route);

startBot();
createTables();
initGmail().catch((err) => console.error("❌ Gmail init failed:", err.message));

module.exports = app
