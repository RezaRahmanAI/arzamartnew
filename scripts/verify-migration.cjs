const sql = require("../frontend/node_modules/mssql");

const cfg = {
  server: "104.234.134.230",
  port: 52196,
  user: "arzamart",
  password: "EscOOh5lch21ud",
  database: "arzamart",
  options: { encrypt: false, trustServerCertificate: true },
};

(async () => {
  const pool = await sql.connect(cfg);

  // Check legacy columns dropped
  const cols = await pool.request().query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME='SizeTemplateEntries'
  `);
  console.log("SizeTemplateEntries columns:", cols.recordset.map(r => r.COLUMN_NAME));

  // Show a sample of data
  const sample = await pool.request().query(`
    SELECT TOP 5 t.Name AS Template, e.Size, e.MeasurementsJson,
           (SELECT STRING_AGG(c.Name, ',') FROM SizeTemplateColumns c WHERE c.SizeTemplateId = t.Id) AS Columns
    FROM SizeTemplates t
    JOIN SizeTemplateEntries e ON e.SizeTemplateId = t.Id
    ORDER BY t.CreatedAtUtc DESC
  `);
  console.log("Sample rows:");
  for (const r of sample.recordset) {
    console.log(`  ${r.Template} | size=${r.Size} | cols=${r.Columns} | measurements=${r.MeasurementsJson}`);
  }

  // Check ProductVariants.ExtrasJson
  const variantCols = await pool.request().query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME='ProductVariants' AND COLUMN_NAME='ExtrasJson'
  `);
  console.log("ProductVariants ExtrasJson exists:", variantCols.recordset.length > 0);

  await pool.close();
})().catch((e) => { console.error(e); process.exit(1); });
