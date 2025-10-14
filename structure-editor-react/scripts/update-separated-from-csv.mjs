import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const separatedDir = path.join(projectRoot, 'separated');

function windowsPathToWsl(p) {
  if (!p) return p;
  // Convert paths like C:\Users\name\file.csv to /mnt/c/Users/name/file.csv
  const match = p.match(/^([A-Za-z]):\\(.*)$/);
  if (match) {
    const drive = match[1].toLowerCase();
    const rest = match[2].replace(/\\/g, '/');
    return `/mnt/${drive}/${rest}`;
  }
  return p;
}

function sanitizeFileName(make) {
  return String(make || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') + '.json';
}

function hashCode(str) {
  // Same 32-bit signed hash approach used in the React app
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0; // Convert to 32-bit int
  }
  return String(h);
}

function getValue(row, variants) {
  // 1) exact normalized match
  for (const v of variants) {
    for (const key of Object.keys(row)) {
      const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normV = v.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normKey === normV) {
        return row[key]?.toString().trim() ?? '';
      }
    }
  }
  // 2) partial match: prefer columns containing the variant token
  for (const v of variants) {
    const normV = v.toLowerCase().replace(/[^a-z0-9]/g, '');
    // collect candidates whose key contains the token
    const candidates = Object.keys(row)
      .filter((key) => key.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normV))
      // stable preference: shorter normalized keys first (closer to exact), then original order
      .sort((a, b) => a.length - b.length);
    for (const key of candidates) {
      const val = row[key]?.toString().trim();
      if (val) return val;
    }
  }
  // 3) broad fuzzy: if variant is generic like 'make'/'model', look for keys ending with it
  for (const v of variants) {
    const normV = v.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normV === 'make' || normV === 'model') {
      const candidates = Object.keys(row)
        .filter((key) => key.toLowerCase().replace(/[^a-z0-9]/g, '').endsWith(normV))
        .sort((a, b) => a.length - b.length);
      for (const key of candidates) {
        const val = row[key]?.toString().trim();
        if (val) return val;
      }
    }
  }
  return '';
}

function toIntOrNull(val) {
  const n = parseInt(String(val).trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function coalesce(...vals) {
  for (const v of vals) {
    if (v && String(v).trim() !== '') return v;
  }
  return '';
}

function toTitleCase(str) {
  if (!str) return '';
  // Preserve hyphens as word separators and title-case each part
  return String(str)
    .split('-')
    .map(part => part
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase())
      .replace(/\s+/g, ' ')
      .trim()
    )
    .join('-');
}

async function main() {
  try {
    const inputArg = process.argv[2];
    if (!inputArg) {
      console.error('Usage: node scripts/update-separated-from-csv.mjs \\path\\to\\file.csv');
      process.exit(1);
    }

    const csvPath = windowsPathToWsl(inputArg);
    if (!fs.existsSync(csvPath)) {
      console.error(`CSV not found: ${csvPath}`);
      process.exit(1);
    }

    if (!fs.existsSync(separatedDir)) {
      fs.mkdirSync(separatedDir, { recursive: true });
    }

    const csvContent = fs.readFileSync(csvPath, 'utf8');

    function detectDelimiter(sample) {
      const lines = sample.split(/\r?\n/).filter(Boolean).slice(0, 5);
      const candidates = [',', ';', '\t', '|'];
      let best = ',';
      let bestScore = -1;
      for (const d of candidates) {
        const counts = lines.map(l => (l.match(new RegExp(`\\${d}`, 'g')) || []).length);
        const score = counts.reduce((a, b) => a + b, 0);
        if (score > bestScore) {
          bestScore = score;
          best = d;
        }
      }
      return best;
    }

    const delimiter = detectDelimiter(csvContent);

    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
      relax_quotes: true,
      delimiter,
    });

    const groups = new Map(); // filename -> array of items

    let inputRows = 0;
    let generatedItems = 0;
    let skippedNoMakeModel = 0;
    let skippedNoYear = 0;

    function parseYearsFromRow(row) {
      // Direct year
      const y = coalesce(
        getValue(row, ['year', 'Year', 'Manufacturing Year', 'Manufacture Year'])
      );
      const yNum = toIntOrNull(y);
      if (yNum && yNum >= 1900 && yNum <= 2100) return [yNum];

      // Range: start/end variants
      const start = toIntOrNull(coalesce(
        getValue(row, ['yearFrom', 'Year From', 'From Year', 'Start Year', 'Start'])
      ));
      const end = toIntOrNull(coalesce(
        getValue(row, ['yearTo', 'Year To', 'To Year', 'End Year', 'End'])
      ));
      if (start && end && start >= 1900 && end <= 2100 && end >= start) {
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
      }

      // Years list: "1970,1971,1972" or "1970-1973"
      const yearsList = coalesce(
        getValue(row, ['years', 'Years', 'Model Years'])
      );
      if (yearsList) {
        const parts = String(yearsList)
          .split(/[,;|]/)
          .map(s => s.trim())
          .filter(Boolean);
        let years = [];
        for (const p of parts) {
          const range = p.match(/^(\d{4})\s*[-–]\s*(\d{4})$/);
          if (range) {
            const a = parseInt(range[1], 10), b = parseInt(range[2], 10);
            if (a >= 1900 && b <= 2100 && b >= a) {
              years.push(...Array.from({ length: b - a + 1 }, (_, i) => a + i));
            }
          } else {
            const n = parseInt(p, 10);
            if (n >= 1900 && n <= 2100) years.push(n);
          }
        }
        if (years.length) return Array.from(new Set(years)).sort((a, b) => a - b);
      }

      return [];
    }

    for (const row of records) {
      inputRows++;
      // Collect all available make/model pairs in this row
      const sources = [
        { make: ['labelMake', 'Label Make', 'Make', 'Manufacturer'], model: ['labelModel', 'Label Model', 'Model'] },
        { make: ['oraeroMake', 'Oraero Make'], model: ['oraeroModel', 'Oraero Model'] },
        { make: ['iatMake', 'IAT Make'], model: ['iatModel', 'IAT Model'] },
        { make: ['rokstoneMake', 'Rokstone Make'], model: ['rokstoneModel', 'Rokstone Model'] },
        { make: ['sfMake', 'SF Make', 'Salesforce Make'], model: ['sfModel', 'SF Model', 'Salesforce Model'] },
        { make: ['underwriterMake', 'Underwriter Make'], model: ['underwriterModel', 'Underwriter Model'] },
        { make: ['otherMake', 'Other Make'], model: ['otherModel', 'Other Model'] },
      ];

      const pairs = [];
      for (const s of sources) {
        const m = toTitleCase(coalesce(getValue(row, s.make)));
        const mdl = coalesce(getValue(row, s.model));
        if (m && mdl) pairs.push({ labelMake: m, labelModel: mdl });
      }
      // Dedup pairs by make+model
      const uniquePairs = Array.from(
        new Map(pairs.map(p => [`${p.labelMake}\u0000${p.labelModel}`, p])).values()
      );

      if (!uniquePairs.length) {
        skippedNoMakeModel++;
        continue;
      }

      const years = parseYearsFromRow(row);
      if (!years.length) {
        skippedNoYear++;
        continue;
      }

      for (const { labelMake, labelModel } of uniquePairs) {
        const fileName = sanitizeFileName(labelMake);
        if (!groups.has(fileName)) groups.set(fileName, []);
        const arr = groups.get(fileName);

        for (const year of years) {
          const item = {
            hash: hashCode(`${labelMake}-${labelModel}-${year}`),
            labelMake,
            labelModel,
            oraeroModel: getValue(row, ['oraeroModel', 'Oraero Model']),
            oraeroMake: getValue(row, ['oraeroMake', 'Oraero Make']) || labelMake,
            iatMake: getValue(row, ['iatMake', 'IAT Make']) || labelMake,
            iatModel: getValue(row, ['iatModel', 'IAT Model']),
            rokstoneMake: getValue(row, ['rokstoneMake', 'Rokstone Make']) || labelMake,
            rokstoneModel: getValue(row, ['rokstoneModel', 'Rokstone Model']),
            sfMake: getValue(row, ['sfMake', 'SF Make', 'Salesforce Make']) || labelMake,
            sfModel: getValue(row, ['sfModel', 'SF Model', 'Salesforce Model']),
            year: String(year),
          };
          if (!arr.some(x => x.hash === item.hash)) {
            arr.push(item);
            generatedItems++;
          }
        }
      }
    }

    // Write files
    const written = [];
    for (const [fileName, items] of groups.entries()) {
      // Sort by year asc, then labelModel asc for consistency
      items.sort((a, b) => {
        const ya = Number(a.year), yb = Number(b.year);
        if (ya !== yb) return ya - yb;
        return String(a.labelModel).localeCompare(String(b.labelModel));
      });
      const outPath = path.join(separatedDir, fileName);
      fs.writeFileSync(outPath, JSON.stringify(items, null, 2));
      written.push(fileName);
      console.log(`Wrote ${fileName} (${items.length} rows)`);
    }

    // Update index.json manifest
    const indexPath = path.join(separatedDir, 'index.json');
    fs.writeFileSync(indexPath, JSON.stringify(written.sort(), null, 2));
    console.log(`Updated manifest: separated/index.json (${written.length} files)`);

    // Summary
    console.log('---');
    console.log(`Rows read: ${inputRows}`);
    console.log(`Items generated: ${generatedItems}`);
    console.log(`Skipped (no make/model): ${skippedNoMakeModel}`);
    console.log(`Skipped (no year): ${skippedNoYear}`);

    console.log('Done.');
  } catch (err) {
    console.error('Failed:', err?.message || err);
    process.exit(1);
  }
}

await main();


