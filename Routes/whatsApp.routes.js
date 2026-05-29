const express = require("express");
const Route = express.Router();
const { notificationHandler, sendMessageHandler } = require("../controllers/whatsApp.controller");

// sending message on whatsapp
Route.post("/sendmessage", sendMessageHandler);

// when message came on whatsapp
Route.post("/notification", notificationHandler);

Route.post("logout", (req, res) => {

});

module.exports = { Route };