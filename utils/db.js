const pool = require("../setup/database.setup");
const sqliteDb = require("../setup/sqlite.setup");

async function createTables() {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS \`groups\` (
                groupId   VARCHAR(64)  PRIMARY KEY,
                groupName VARCHAR(255)
            )
        `);

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS users (
                user_id  INT          PRIMARY KEY AUTO_INCREMENT,
                groupId  VARCHAR(64),
                mobNo    VARCHAR(15)  NOT NULL UNIQUE,
                email    VARCHAR(255) NOT NULL UNIQUE,
                name     VARCHAR(255) NOT NULL,
                FOREIGN KEY (groupId) REFERENCES \`groups\`(groupId)
            )
        `);

        // Remove MySQL Token table logic from here
        // We will create the Token table in SQLite below instead.

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS group_members (
                jid     VARCHAR(64)  NOT NULL,
                groupId VARCHAR(64)  NOT NULL,
                email   VARCHAR(255) DEFAULT NULL,
                PRIMARY KEY (jid, groupId),
                FOREIGN KEY (groupId) REFERENCES \`groups\`(groupId)
            )
        `);

        // Seed MySQL tables
        console.log("✅ MySQL tables ready");

        // Set up SQLite Token table
        sqliteDb.run(`
            CREATE TABLE IF NOT EXISTS Token (
                name TEXT UNIQUE,
                token TEXT
            )
        `, (err) => {
            if (err) {
                console.error("❌ Error creating SQLite Token table:", err.message);
            } else {
                sqliteDb.run(`INSERT OR IGNORE INTO Token VALUES ("authLlm", "here comes token")`);
                sqliteDb.run(`INSERT OR IGNORE INTO Token VALUES ("authSched", "here comes token")`);
                console.log("✅ SQLite Token table ready");
            }
        });

    } catch (error) {
        console.error("❌ Error creating MySQL tables:", error.message);
    }
}

module.exports = { createTables };