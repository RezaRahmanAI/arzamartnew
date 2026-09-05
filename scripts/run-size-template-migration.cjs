const fs = require("fs");
const path = require("path");
const sql = require("../frontend/node_modules/mssql");

const sqlFile = path.resolve(
  "D:\\Personal\\alzeena\\prisma\\migrations\\manual_size_template_columns_step2.sql"
);
const content = fs.readFileSync(sqlFile, "utf8");

// mssql doesn't support GO separators. Split manually.
const batches = content
  .split(/^\s*GO\s*$/gim)
  .map((b) => b.trim())
  .filter(Boolean);

const cfg = {
  server: "104.234.134.230",
  port: 52196,
  user: "arzamart",
  password: "EscOOh5lch21ud",
  database: "arzamart",
  requestTimeout: 300000,
  connectionTimeout: 30000,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

(async () => {
  try {
    const pool = await sql.connect(cfg);
    console.log("Connected. Running", batches.length, "batch(es)...");
    for (let i = 0; i < batches.length; i++) {
      try {
        const r = await pool.request().batch(batches[i]);
        console.log("Batch", i + 1, "ok. Rows:", r && r.rowsAffected ? r.rowsAffected : "(n/a)");
      } catch (err) {
        console.error("Batch", i + 1, "error:", err.message);
      }
    }

    // Verify
    const probe = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_NAME='ProductVariants' AND COLUMN_NAME='ExtrasJson') AS ExtrasJson,
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_NAME='SizeTemplateEntries' AND COLUMN_NAME='MeasurementsJson') AS MeasurementsJson,
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_NAME='SizeTemplateColumns') AS SizeTemplateColumns
    `);
    console.log("Probe:", JSON.stringify(probe.recordset[0]));

    await pool.close();
    console.log("Done.");
  } catch (err) {
    console.error("Connection error:", err);
    process.exit(1);
  }
})();
