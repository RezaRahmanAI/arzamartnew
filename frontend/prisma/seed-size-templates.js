/**
 * Seed size templates with realistic dummy data.
 *
 * Behaviour:
 *  - For any of the 2 existing templates ("Tshirt", "Palazzo"): ensures the
 *    column set exists and backfills the measurement values.
 *  - Adds 4 additional templates: Polo Shirt, Formal Shirt, Chino Pants,
 *    Hoodie (plus Panjabi to round things out).
 *
 * The script is idempotent: running it multiple times will not create
 * duplicate templates. To re-seed, delete the template in the admin UI
 * (cascade handles columns + entries).
 *
 * Run with:  node prisma/seed-size-templates.js
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function uuid() {
  return require("crypto").randomUUID();
}

// value to "" -> omit; keep only truthy numeric values
const pick = (m) => {
  const out = {};
  for (const [k, v] of Object.entries(m)) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s === "") continue;
    out[k] = s;
  }
  return out;
};

const TEMPLATE_DEFS = [
  // --- Existing templates (re-seed measurement values) ----------------
  {
    name: "Tshirt",
    columns: [
      { name: "Chest", displayOrder: 0 },
      { name: "Length", displayOrder: 1 },
      { name: "Waist", displayOrder: 2 },
      { name: "Sleeve", displayOrder: 3 },
    ],
    rows: [
      { size: "M",  measurements: { Chest: "38", Length: "27", Waist: "37", Sleeve: "8" } },
      { size: "L",  measurements: { Chest: "40", Length: "28", Waist: "39", Sleeve: "8.5" } },
      { size: "XL", measurements: { Chest: "42", Length: "29", Waist: "41", Sleeve: "9" } },
      { size: "XXL",measurements: { Chest: "44", Length: "30", Waist: "43", Sleeve: "9.5" } },
    ],
  },
  {
    name: "Palazzo",
    columns: [
      { name: "Waist", displayOrder: 0 },
      { name: "Length", displayOrder: 1 },
      { name: "Hip", displayOrder: 2 },
      { name: "Inseam", displayOrder: 3 },
    ],
    rows: [
      { size: "6",  measurements: { Waist: "21-23", Length: "লম্বা 28", Hip: "32", Inseam: "20" } },
      { size: "8",  measurements: { Waist: "23-25", Length: "লম্বা 30", Hip: "34", Inseam: "21" } },
      { size: "10", measurements: { Waist: "25-27", Length: "লম্বা 32", Hip: "36", Inseam: "22" } },
      { size: "12", measurements: { Waist: "27-29", Length: "লম্বা 34", Hip: "38", Inseam: "23" } },
      { size: "14", measurements: { Waist: "29-31", Length: "লম্বা 36", Hip: "40", Inseam: "24" } },
      { size: "16", measurements: { Waist: "31-33", Length: "লম্বা 38", Hip: "42", Inseam: "25" } },
    ],
  },
  // --- New templates ---------------------------------------------------
  {
    name: "Polo Shirt",
    columns: [
      { name: "Chest", displayOrder: 0 },
      { name: "Length", displayOrder: 1 },
      { name: "Shoulder", displayOrder: 2 },
      { name: "Sleeve", displayOrder: 3 },
    ],
    rows: [
      { size: "M",   measurements: { Chest: "38", Length: "27", Shoulder: "17.5", Sleeve: "8" } },
      { size: "L",   measurements: { Chest: "40", Length: "28", Shoulder: "18",   Sleeve: "8.5" } },
      { size: "XL",  measurements: { Chest: "42", Length: "29", Shoulder: "18.5", Sleeve: "9" } },
      { size: "XXL", measurements: { Chest: "44", Length: "30", Shoulder: "19",   Sleeve: "9.5" } },
    ],
  },
  {
    name: "Formal Shirt",
    columns: [
      { name: "Chest", displayOrder: 0 },
      { name: "Length", displayOrder: 1 },
      { name: "Shoulder", displayOrder: 2 },
      { name: "Sleeve", displayOrder: 3 },
      { name: "Neck", displayOrder: 4 },
    ],
    rows: [
      { size: "M",   measurements: { Chest: "40", Length: "28", Shoulder: "18", Sleeve: "24", Neck: "15.5" } },
      { size: "L",   measurements: { Chest: "42", Length: "29", Shoulder: "18.5", Sleeve: "24.5", Neck: "16" } },
      { size: "XL",  measurements: { Chest: "44", Length: "30", Shoulder: "19", Sleeve: "25", Neck: "16.5" } },
      { size: "XXL", measurements: { Chest: "46", Length: "31", Shoulder: "19.5", Sleeve: "25.5", Neck: "17" } },
    ],
  },
  {
    name: "Panjabi Regular",
    columns: [
      { name: "Chest", displayOrder: 0 },
      { name: "Length", displayOrder: 1 },
      { name: "Shoulder", displayOrder: 2 },
      { name: "Sleeve", displayOrder: 3 },
      { name: "Neck", displayOrder: 4 },
    ],
    rows: [
      { size: "38", measurements: { Chest: "40", Length: "40", Shoulder: "17", Sleeve: "23", Neck: "15" } },
      { size: "40", measurements: { Chest: "42", Length: "41", Shoulder: "17.5", Sleeve: "23.5", Neck: "15.5" } },
      { size: "42", measurements: { Chest: "44", Length: "42", Shoulder: "18", Sleeve: "24", Neck: "16" } },
      { size: "44", measurements: { Chest: "46", Length: "43", Shoulder: "18.5", Sleeve: "24.5", Neck: "16.5" } },
      { size: "46", measurements: { Chest: "48", Length: "44", Shoulder: "19", Sleeve: "25", Neck: "17" } },
    ],
  },
  {
    name: "Chino Pants",
    columns: [
      { name: "Waist", displayOrder: 0 },
      { name: "Length", displayOrder: 1 },
      { name: "Hip", displayOrder: 2 },
      { name: "Inseam", displayOrder: 3 },
      { name: "Thigh", displayOrder: 4 },
    ],
    rows: [
      { size: "28", measurements: { Waist: "28", Length: "39", Hip: "36", Inseam: "29", Thigh: "21" } },
      { size: "30", measurements: { Waist: "30", Length: "40", Hip: "38", Inseam: "30", Thigh: "22" } },
      { size: "32", measurements: { Waist: "32", Length: "41", Hip: "40", Inseam: "31", Thigh: "23" } },
      { size: "34", measurements: { Waist: "34", Length: "42", Hip: "42", Inseam: "31.5", Thigh: "24" } },
      { size: "36", measurements: { Waist: "36", Length: "42.5", Hip: "44", Inseam: "32", Thigh: "25" } },
    ],
  },
  {
    name: "Hoodie",
    columns: [
      { name: "Chest", displayOrder: 0 },
      { name: "Length", displayOrder: 1 },
      { name: "Shoulder", displayOrder: 2 },
      { name: "Sleeve", displayOrder: 3 },
      { name: "Hood Depth", displayOrder: 4 },
    ],
    rows: [
      { size: "M",   measurements: { Chest: "42", Length: "27", Shoulder: "19", Sleeve: "25", "Hood Depth": "12" } },
      { size: "L",   measurements: { Chest: "44", Length: "28", Shoulder: "19.5", Sleeve: "25.5", "Hood Depth": "12.5" } },
      { size: "XL",  measurements: { Chest: "46", Length: "29", Shoulder: "20", Sleeve: "26", "Hood Depth": "13" } },
      { size: "XXL", measurements: { Chest: "48", Length: "30", Shoulder: "20.5", Sleeve: "26.5", "Hood Depth": "13.5" } },
    ],
  },
];

async function upsertTemplate(def) {
  // 1. Find or create the template
  let tpl = await prisma.sizeTemplate.findFirst({ where: { name: def.name } });
  const isNew = !tpl;
  if (!tpl) {
    tpl = await prisma.sizeTemplate.create({ data: { name: def.name } });
    console.log(`  + created template: ${def.name}`);
  } else {
    console.log(`  = template exists: ${def.name} (rebuilding columns/entries)`);
  }

  // 2. Replace columns
  await prisma.sizeTemplateColumn.deleteMany({ where: { sizeTemplateId: tpl.id } });
  const columnIdByName = new Map();
  for (const col of def.columns) {
    const created = await prisma.sizeTemplateColumn.create({
      data: {
        sizeTemplateId: tpl.id,
        name: col.name,
        displayOrder: col.displayOrder,
      },
    });
    columnIdByName.set(col.name.toLowerCase(), created.id);
  }

  // 3. Replace entries
  await prisma.sizeTemplateEntry.deleteMany({ where: { sizeTemplateId: tpl.id } });
  for (let i = 0; i < def.rows.length; i++) {
    const row = def.rows[i];
    const normalized = {};
    for (const [key, val] of Object.entries(row.measurements)) {
      const colId = columnIdByName.get(String(key).toLowerCase());
      if (!colId) continue;
      const s = String(val).trim();
      if (!s) continue;
      normalized[colId] = s;
    }
    await prisma.sizeTemplateEntry.create({
      data: {
        sizeTemplateId: tpl.id,
        size: row.size,
        measurementsJson: JSON.stringify(normalized),
        displayOrder: i,
      },
    });
  }

  return { tpl, isNew };
}

async function main() {
  console.log(`Seeding ${TEMPLATE_DEFS.length} size templates...`);
  let created = 0;
  let updated = 0;
  for (const def of TEMPLATE_DEFS) {
    const r = await upsertTemplate(def);
    if (r.isNew) created++; else updated++;
  }
  console.log(`\nDone. Created: ${created}, updated: ${updated}.`);
  console.log(`Total templates in DB: ${await prisma.sizeTemplate.count()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
