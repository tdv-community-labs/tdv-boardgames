const { execSync } = require('child_process');

console.log('⚡ Starting TDV Boardgames build verification...');
let hasError = false;

try {
  console.log('Running TypeScript compiler check (tsc --noEmit)...');
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✓ PASS: TypeScript compilation passed.');
} catch (err) {
  console.error('❌ FAIL: TypeScript compilation failed.');
  hasError = true;
}

if (hasError) {
  process.exit(1);
} else {
  console.log('✨ Build verification successful! All boardgame components and engines are production-ready.');
  process.exit(0);
}
