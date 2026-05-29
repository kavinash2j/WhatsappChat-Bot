const express = require("express");
const Route = express.Router();
const { google } = require("googleapis");
const fs = require("fs");
const util = require("util")
const axios = require("axios");

const client_secret = process.env.GOOGLE_CLIENT_SECRET;
const client_id = process.env.GOOGLE_CLIENT_ID;
const redirect_uris = process.env.GOOGLE_REDIRECT_URI;

const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris
);


Route.get("/auth/google", (req, res) => {

    const url = oAuth2Client.generateAuthUrl({
        access_type: "offline",   // important: tells Google to give refresh_token
        prompt: "consent",
        scope: ["https://www.googleapis.com/auth/calendar"],
    });

    // console.log("Route hit auth google");

    res.redirect(url);

});


Route.get("/auth/google/callback", async (req, res) => {

    const { code } = req.query;

    const { tokens } = await oAuth2Client.getToken(code);

    oAuth2Client.setCredentials(tokens);

    // Save tokens for reuse
    fs.writeFileSync("tokens.json", JSON.stringify(tokens));

    res.send("✅ Google Calendar connected!");

});


module.exports = { oAuth2Client, Route }