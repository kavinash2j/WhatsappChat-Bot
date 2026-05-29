# 🚀 WhatsApp Bot Setup Guide

Welcome to the setup guide for the WhatsApp Chat Bot! This document will walk you through everything needed to get the application up and running locally.

## 1️⃣ Prerequisites
Before starting, ensure you have the following installed on your machine:
- **Node.js** (v18 or higher recommended)
- **MySQL Server** (Running locally or hosted)
- A **Google Cloud Console** account (for Gemini AI and Google Calendar APIs)
- A **WhatsApp account** (to scan the QR code and act as the bot)

---

## 2️⃣ Environment Variables (`.env`)
Create a `.env` file in the root directory of your project and populate it with the following keys:

```env
# Server Setup
Backend=http://localhost:3000
PORT=3000

# WhatsApp Bot Identifier (Your Bot's Phone Number without '+' sign)
MOBNO=919876543210

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=whatsapp_bot

# Authentication Secrets
JWT_SECRET=your_super_secret_jwt_key

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key

# Gmail Service Setup
APP_GMAIL=your_gmail_address@gmail.com
APP_PASSWORD=your_google_app_password
```

---

## 3️⃣ Database Initialization
The application uses a **dual-database architecture**:
1. **MySQL**: Used to store Groups and User relationships.
2. **SQLite**: Used to store Authentication Tokens (creates `mydata.db` automatically).

**Steps:**
1. Open your MySQL server and create the database referenced in your `.env`:
   ```sql
   CREATE DATABASE whatsapp_bot;
   ```
2. You do not need to manually create tables; the app will automatically create them on boot.

---

## 4️⃣ Google Calendar Setup (`tokens.json`)
To allow the bot to schedule Google Meet events, you need Google Calendar OAuth credentials.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Google Calendar API**.
3. Create **OAuth 2.0 Client IDs**.
4. Run your initial OAuth flow to generate a `tokens.json` file.
5. Place the `tokens.json` file in the root directory of your project.

---

## 5️⃣ Gmail Service Setup
To allow the bot to send emails (using `nodemailer`), you need to generate an App Password.

1. Go to your Google Account Settings -> **Security**.
2. Enable **2-Step Verification**.
3. Search for **App Passwords** and create one for "Mail".
4. Copy the generated 16-character password and paste it into the `APP_PASSWORD` field in your `.env` file.

---

## 6️⃣ Starting the Application

1. **Install Dependencies**
   Run the following command in your terminal to install all required Node modules:
   ```bash
   npm install
   ```

2. **Start the Server**
   Start the application using:
   ```bash
   npm start
   ```
   *(Or use `npm run dev` if you are using nodemon for development).*

3. **Link WhatsApp**
   - Look at your terminal; a **QR Code** will be printed.
   - Open WhatsApp on your phone -> **Linked Devices** -> **Link a Device**.
   - Scan the QR code.
   - The bot will generate an `auth_info/` folder to save your login session so you don't have to scan the QR code every time you restart the server.

---

## 🎉 You're All Set!
Your WhatsApp bot is now active, connected to the database, synced with Google Calendar, and ready to send emails and AI responses!
