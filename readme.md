# 🤖 WhatsApp AI & Scheduling Chat Bot

An intelligent WhatsApp bot built with Node.js, Express, and Baileys. The bot leverages Google's Gemini AI to answer questions dynamically and integrates with the Google Calendar API to schedule Google Meet events seamlessly through WhatsApp conversations. It also automatically tracks group members and sends them calendar invitations via Gmail!

## 📁 Project Architecture

This project follows a clean MVC-style architecture to ensure maintainability:
- **`/Routes`**: Defines the API endpoints for the application.
- **`/controllers`**: Contains the business logic for handling incoming route requests.
- **`/services`**: Houses core functionality, including Baileys WhatsApp interactions, Gemini AI logic, Gmail transporter logic, and group DM management.
- **`/setup`**: Stores initialization files for Baileys (`whatsapp.setup.js`), MySQL (`database.setup.js`), SQLite (`sqlite.setup.js`), Google Calendar, and Gmail.
- **`/utils`**: Contains database schema definitions and table creation scripts.
- **`/middlewares`**: Contains JWT authentication middleware.

---

## 🛣️ API Routes & Documentation

Below is a complete list of internal API routes used by the application. *(Note: Many of these are consumed internally by the WhatsApp bot itself).*

### 🟢 WhatsApp Routes (`/Routes/whatsApp.routes.js`)

#### `POST /notification`
- **Controller:** `notificationHandler`
- **Purpose:** The main webhook that triggers when a WhatsApp message is received. It parses the message, identifies commands (like `@Task`), triggers the AI chatbot, and dispatches responses.

#### `POST /sendmessage`
- **Controller:** `sendMessageHandler`
- **Purpose:** Sends a direct WhatsApp message to a specific number.
- **Body:** `{ "number": "919876543210@s.whatsapp.net", "message": "Hello!" }`

#### `POST /logout`
- **Purpose:** Logs out the current WhatsApp session.

---

### 🧠 LLM / AI Routes (`/Routes/llm.routes.js`)

#### `POST /ai-chatBot`
- **Controller:** `aiChatBotHandler`
- **Purpose:** Takes a natural language query, formats it using a rigid prompt, and sends it to the **Gemini 2.5 Flash** model. It returns JSON specifying if the user is asking a general question, requesting a meeting, or if there's an error.
- **Body:** `{ "message": "Schedule a meeting tomorrow at 3pm" }`

---

### 📅 Calendar & Meeting Routes (`/Routes/meetSchedule.routes.js`)

#### `POST /addevent`
- **Controller:** `addEventHandler`
- **Purpose:** Schedules a Google Meet event. If a `groupId` is provided, it automatically fetches all saved emails for that group from MySQL and adds them as attendees. Uses `sendUpdates: "all"` to automatically dispatch Google Calendar email invites.
- **Body:** 
  ```json
  {
    "attribute": {
      "title": "Project Sync",
      "description": "Weekly catchup",
      "start": { "dateTime": "2026-06-01T15:00:00" },
      "end": { "dateTime": "2026-06-01T15:30:00" }
    },
    "groupId": "120363000000000@g.us"
  }
  ```

#### `POST /events`
- **Controller:** `getEventsHandler`
- **Purpose:** Fetches a list of the next 10 upcoming events from the connected Google Calendar.

---

### 📧 Gmail Routes (`/Routes/gmail.routes.js`)

#### `POST /sendmail`
- **Controller:** `sendMailHandler`
- **Purpose:** Sends a plain-text email using Nodemailer and Gmail. 
- **Body:** `{ "to": "user@example.com", "subject": "Hello", "text": "Message content" }`

---

## 🛠️ Setup Instructions
If you are looking to set up the project locally, please refer to the [setup.md](./setup.md) file for detailed, step-by-step instructions on configuring your `.env`, Databases, and Google APIs.
