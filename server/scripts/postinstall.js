import { execSync } from 'child_process';

console.log('🏗️  Running Post-Install...');

const dbUrl = process.env.DATABASE_URL;
const nodeEnv = process.env.NODE_ENV;

console.log(`🔍 Checking DATABASE_URL: ${dbUrl ? 'Found' : 'MISSING'}`);
console.log(`🔍 Checking NODE_ENV: ${nodeEnv}`);

// If on Render (Production), ALWAYS use Postgres schema (checked via NODE_ENV or DB URL)
if ((dbUrl && dbUrl.startsWith('postgres')) || nodeEnv === 'production') {
    console.log('🚀 Detected Production/Postgres Environment. Generating Client for Postgres...');
    try {
        execSync('npx prisma generate --schema prisma/schema.postgres.prisma', { stdio: 'inherit' });
    } catch (e) {
        console.error('Failed to generate Postgres client:', e);
        process.exit(1);
    }
} else {
    console.log('💻 Detected Local/SQLite Environment. Generating Default Client...');
    try {
        execSync('npx prisma generate', { stdio: 'inherit' });
    } catch (e) {
        console.error('Failed to generate SQLite client:', e);
    }
}
