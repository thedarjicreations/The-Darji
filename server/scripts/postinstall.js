console.log('🏗️  Running Post-Install...');

const dbUrl = process.env.DATABASE_URL;
console.log(`🔍 Checking DATABASE_URL: ${dbUrl ? 'Found (Starts with ' + dbUrl.substring(0, 10) + '...)' : 'MISSING'}`);

if (dbUrl && dbUrl.startsWith('postgres')) {
    console.log('🚀 Detected Postgres Environment. Generating Client for Postgres...');
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
        // Don't fail install on local if prisma fails, might be just setup
    }
}
