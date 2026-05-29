const jwt = require("jsonwebtoken");
const sqliteDb = require("../setup/sqlite.setup");

const secret = process.env.JWT_SECRET;

const generateToken = function (info) {
    const token = jwt.sign({ info }, secret, { expiresIn: '24h' });
    return token;
};

const verifyToken_llm = function (req, res, next) {
    const { message } = req.body;

    sqliteDb.get(`SELECT token FROM Token WHERE name = "authLlm"`, [], (err, row) => {
        if (err) {
            console.error("❌ verifyToken_llm error:", err.message);
        } else if (!row) {
            return res.status(401).json({ error: "Token not found" });
        } else {
            const token = row.token;
            const isTrue = jwt.verify(token, secret);

            if (isTrue.info == message) {
                next();
            } else {
                console.log("error in the verify token of the llm model");
            }
        }
    });
};

const verifyToken_sced = function (req, res, next) {
    const { message } = req.body;

    sqliteDb.get(`SELECT token FROM Token WHERE name = "authSched"`, [], (err, row) => {
        if (err) {
            console.error("❌ verifyToken_sced error:", err.message);
        } else if (!row) {
            return res.status(401).json({ error: "Token not found" });
        } else {
            const token = row.token;
            const isTrue = jwt.verify(token, secret);

            if (isTrue.info == message) {
                next();
            } else {
                console.log("error in the token verify of the scheduler");
            }
        }
    });
};

module.exports = { generateToken, verifyToken_llm, verifyToken_sced };