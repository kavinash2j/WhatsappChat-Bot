const { sendMail } = require("../services/gmail.services");

const sendMailHandler = async (req, res) => {
    try {
        const { to, subject, text } = req.body;

        if (!to || !subject || !text) {
            return res.status(400).json({
                error: "Missing required fields: to, subject, text",
            });
        }

        const info = await sendMail(to, subject, text);

        res.status(200).json({
            message: "Email sent successfully!",
            messageId: info.messageId,
            to,
            from: process.env.APP_GMAIL,
        });
    } catch (error) {
        console.error("❌ Error in /sendmail:", error.message);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { sendMailHandler };
