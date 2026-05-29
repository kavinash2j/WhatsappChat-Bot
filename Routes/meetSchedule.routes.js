const express = require("express");
const Route = express.Router();
const { getEventsHandler, addEventHandler } = require("../controllers/meetSchedule.controller");

Route.post("/events", getEventsHandler);
Route.post("/addevent", addEventHandler);

module.exports = { Route };