import { execSync } from 'child_process';

console.log('🏗️  Running Post-Install...');
console.log('═══════════════════════════════════════════════════════');

const dbUrl = process.env.DATABASE_URL;
const nodeEnv = process.env.NODE_ENV;
const isRender = process.env.RENDER === 'true'; // Render sets this automatically

console.log(`🔍 Environment Variables:`);
console.log(`   - DATABASE_URL: ${dbUrl ? (dbUrl.substring(0, 20) + '...') : 'MISSING'}`);
console.log(`   - NODE_ENV: ${nodeEnv || 'NOT SET'}`);
console.log(`   - RENDER: ${isRender ? 'true (Render Platform)' : 'false'}`);
console.log('═══════════════════════════════════════════════════════');

// Determine if we're in a production/cloud environment
const isPostgresUrl = dbUrl && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://'));
const isProduction = nodeEnv === 'production' || isRender;

console.log(`📊 Detection Results:`);
console.log(`   - PostgreSQL URL detected: ${isPostgresUrl ? 'YES' : 'NO'}`);
console.log(`   - Production environment: ${isProduction ? 'YES' : 'NO'}`);
console.log('═══════════════════════════════════════════════════════');

// Use PostgreSQL schema if either condition is true
if (isPostgresUrl || isProduction) {
    console.log('🚀 Using PostgreSQL Schema (Production/Cloud Deployment)');
    console.log('   Schema: prisma/schema.postgres.prisma');
    console.log('═══════════════════════════════════════════════════════');
    try {
        execSync('npx prisma generate --schema prisma/schema.postgres.prisma', { stdio: 'inherit' });
        console.log('✅ PostgreSQL Prisma Client generated successfully!');
    } catch (e) {
        console.error('❌ Failed to generate Postgres client:', e);
        process.exit(1);
    }
} else {
    console.log('💻 Using SQLite Schema (Local Development)');
    console.log('   Schema: prisma/schema.prisma');
    console.log('═══════════════════════════════════════════════════════');
    try {
        execSync('npx prisma generate', { stdio: 'inherit' });
        console.log('✅ SQLite Prisma Client generated successfully!');
    } catch (e) {
        console.error('❌ Failed to generate SQLite client:', e);
        process.exit(1);
    }
}
