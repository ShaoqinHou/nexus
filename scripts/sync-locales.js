// Sync missing keys from en.json to ko.json and fr.json
// Uses English text as fallback for untranslated keys
const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'packages', 'web', 'src', 'locales');
const en = JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8'));

for (const locale of ['ko', 'fr']) {
  const filePath = path.join(localesDir, `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  let added = 0;
  for (const key of Object.keys(en)) {
    if (!data[key]) {
      data[key] = en[key]; // English fallback
      added++;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  console.log(`${locale}: added ${added} keys (total: ${Object.keys(data).length})`);
}
