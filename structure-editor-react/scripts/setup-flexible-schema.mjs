import 'dotenv/config';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${scriptName}`);
    console.log('='.repeat(60));
    
    const proc = spawn('node', [path.join(__dirname, `${scriptName}.mjs`)], {
      stdio: 'inherit',
      env: process.env
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${scriptName} failed with code ${code}`));
      }
    });
  });
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Flexible Schema Setup - Complete Installation            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Upgrade existing tables
    console.log('📋 Step 1/3: Upgrading existing tables...');
    await runScript('upgrade-makes-table');
    await runScript('upgrade-models-table');

    // Step 2: Create new schema (providers, mappings, views)
    console.log('\n📋 Step 2/3: Creating new tables and views...');
    await runScript('create-flexible-schema');

    // Step 3: Migrate data (optional - only if makemodels_items exists)
    console.log('\n📋 Step 3/3: Migrating data...');
    await runScript('migrate-to-flexible-schema');

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ Setup Complete!                                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('Next steps:');
    console.log('  • View providers: npm run db:list:providers');
    console.log('  • View makes: npm run db:view:makes');
    console.log('  • Add provider: PROVIDER_CODE=xyz PROVIDER_NAME="XYZ" npm run db:add:provider');
    console.log('  • Export data: npm run db:export:flexible\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main();

