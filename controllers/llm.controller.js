const { GoogleGenerativeAI } = require("@google/generative-ai");
const { promptGene } = require("../services/llm.services");

const aiChatBotHandler = async (req, res) => {
    const { message } = req.body;

    try {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("❌ GEMINI_API_KEY is missing from environment variables.")
            return res.status(503).json({
                type: "service_error",
                answer: "Sorry, I'm not available right now. Please try again after some time."
            })
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = promptGene(message);

        const result = await model.generateContent(prompt);
        console.log(result.response.text());
        const response = result.response;
        const text = response.text();

        // Parse JSON — handle both ```json ... ``` blocks and raw JSON
        let json_text
        try {
            const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim()
            json_text = JSON.parse(cleaned)
        } catch (parseErr) {
            console.error("❌ Failed to parse AI response as JSON:", text)
            return res.status(500).json({
                type: "service_error",
                answer: "Sorry, I didn't quite understand that. Could you please rephrase and try again?"
            })
        }

        res.json(json_text);

    } catch (error) {

        console.error("❌ Error in LLM route:", error.message)

        // Detect Google API quota / rate-limit errors (429) or network issues
        const status = error?.status || error?.response?.status
        if (status === 429 || error?.message?.includes("quota") || error?.message?.includes("rate")) {
            return res.status(429).json({
                type: "service_error",
                answer: "Sorry, I'm a little busy right now. Please give me a moment and try again."
            })
        }

        // Generic Google API / network errors
        return res.status(503).json({
            type: "service_error",
            answer: "Sorry, I'm not available right now. Please try again after some time."
        })
    }
};

module.exports = { aiChatBotHandler };
