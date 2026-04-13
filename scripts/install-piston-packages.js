// Installs language runtimes into the running Piston container.
// Usage: node scripts/install-piston-packages.js
// Requires the `piston` service from docker-compose to be up and reachable on PISTON_URL.

const PISTON_URL = process.env.PISTON_URL || 'http://localhost:2000';

const languages = [
  'node',     // javascript / typescript
  'python',
  'java',
  'gcc',      // c / c++
  'go',
  'rust',
  'typescript',
];

async function installPackages() {
  console.log(`Fetching available packages from ${PISTON_URL}...`);
  const res = await fetch(`${PISTON_URL}/api/v2/packages`);
  if (!res.ok) {
    console.error(`Failed to query Piston: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const allPackages = await res.json();

  let failures = 0;
  for (const lang of languages) {
    const pkg = allPackages.find((p) => p.language === lang);
    if (!pkg) {
      console.error(`✗ ${lang} not found in Piston repo`);
      failures++;
      continue;
    }

    process.stdout.write(`Installing ${pkg.language} ${pkg.language_version}... `);
    const installRes = await fetch(`${PISTON_URL}/api/v2/packages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: pkg.language, version: pkg.language_version }),
    });

    if (installRes.ok) {
      console.log('ok');
    } else {
      failures++;
      console.log(`failed: ${await installRes.text()}`);
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} package(s) failed to install. Re-run to retry.`);
    process.exit(1);
  }
  console.log('\nAll packages installed.');
}

installPackages().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
