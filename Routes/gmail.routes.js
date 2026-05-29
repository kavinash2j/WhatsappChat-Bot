const express = require("express");
const Route = express.Router();
const { sendMailHandler } = require("../controllers/gmail.controller");

// POST /sendmail
// Body: { to: "recipient@example.com", subject: "Hello", text: "Your message here" }
// The `from` address is always taken from APP_GMAIL in .env
Route.post("/sendmail", sendMailHandler);

module.exports = { Route };
