const express = require("express");
const Route = express.Router();
const { verifyToken_llm } = require("../middlewares/auth_middleware");
const { aiChatBotHandler } = require("../controllers/llm.controller");

Route.post("/ai-chatBot", aiChatBotHandler);

module.exports = { Route };