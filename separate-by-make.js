const fs = require('fs');
const path = require('path');

// Read the database.json file
const databasePath = path.join(__dirname, 'database.json');
const outputDir = path.join(__dirname, 'separated');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

try {
  const data = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
  
  // Group items by labelMake
  const groupedByMake = {};
  
  data.forEach(item => {
    const make = item.labelMake || 'unknown';
    if (!groupedByMake[make]) {
      groupedByMake[make] = [];
    }
    groupedByMake[make].push(item);
  });
  
  // Write separate files for each make
  Object.entries(groupedByMake).forEach(([make, items]) => {
    // Sanitize filename - replace spaces and special chars with hyphens
    const filename = make.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') + '.json';
    
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(items, null, 2));
    console.log(`Created ${filename} with ${items.length} items`);
  });
  
  console.log(`\nTotal makes: ${Object.keys(groupedByMake).length}`);
  console.log(`Files created in: ${outputDir}`);
  
} catch (error) {
  console.error('Error:', error.message);
}
