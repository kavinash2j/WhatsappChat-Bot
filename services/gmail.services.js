const { getTransporter } = require("../setup/gmail.setup");

/**
 * Send an email via Gmail (nodemailer + app password)
 *
 * @param {string} to        - Recipient email address
 * @param {string} subject   - Email subject line
 * @param {string} text      - Plain-text body of the email
 * @returns {Promise<object>} - nodemailer send info object
 */
async function sendMail(to, subject, text) {
    const transporter = getTransporter();

    const mailOptions = {
        from: process.env.APP_GMAIL,   // sender is always the app Gmail from .env
        to,
        subject,
        text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to} | MessageId: ${info.messageId}`);
    return info;
}



module.exports = { sendMail };
