const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
    if (!transporter) {
        throw new Error("Gmail transporter is not initialized. Call initGmail() first.");
    }
    return transporter;
}

async function initGmail() {
    transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.APP_GMAIL,
            pass: process.env.APP_PASSWORD,
        },
    });

    // Verify the connection configuration
    await transporter.verify();
    console.log("✅ Gmail transporter connected successfully using:", process.env.APP_GMAIL);
}

module.exports = { initGmail, getTransporter };
