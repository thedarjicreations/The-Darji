import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Client } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbUrl = process.argv[2];
if (!dbUrl) {
    console.error('❌ Please provide DATABASE_URL as an argument');
    process.exit(1);
}

const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

import { execSync } from 'child_process';

async function restore() {
    console.log('🏗️  Creating Database Tables (Schema Push)...');
    try {
        // Set env var for this process
        process.env.DATABASE_URL = dbUrl;
        execSync('npx prisma db push --schema prisma/schema.postgres.prisma --accept-data-loss', { stdio: 'inherit' });
        console.log('✅ Tables created successfully!');
    } catch (e) {
        console.error('❌ Failed to create tables:', e);
        process.exit(1);
    }

    console.log('🚀 Connecting to Cloud Database...');
    await client.connect();

    // Read backup file
    const backupPath = path.join(__dirname, '../../backup.json');
    const data = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

    try {
        console.log('🧹 Cleaning existing cloud data (optional)...');
        // Delete in reverse dependency order
        await client.query('DELETE FROM "Invoice"');
        await client.query('DELETE FROM "TrialNote"');
        await client.query('DELETE FROM "SpecialRequirement"');
        await client.query('DELETE FROM "AdditionalService"');
        await client.query('DELETE FROM "OrderItem"');
        await client.query('DELETE FROM "Order"');
        await client.query('DELETE FROM "MeasurementTemplate"');
        await client.query('DELETE FROM "Message"');
        await client.query('DELETE FROM "Client"');
        await client.query('DELETE FROM "GarmentType"');
        await client.query('DELETE FROM "User"');

        console.log('📦 Starting Import...');

        // 1. Users
        for (const user of data.users) {
            await client.query(
                'INSERT INTO "User" (id, username, password, name, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6)',
                [user.id, user.username, user.password, user.name, new Date(user.createdAt), new Date(user.updatedAt)]
            );
        }
        console.log(`✅ Imported ${data.users.length} Users`);

        // 2. GarmentTypes
        for (const gt of data.garmentTypes) {
            await client.query(
                'INSERT INTO "GarmentType" (id, name, price, cost, description, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [gt.id, gt.name, gt.price, gt.cost, gt.description, new Date(gt.createdAt), new Date(gt.updatedAt)]
            );
        }
        console.log(`✅ Imported ${data.garmentTypes.length} GarmentTypes`);

        // 3. Clients
        for (const c of data.clients) {
            await client.query(
                'INSERT INTO "Client" (id, name, phone, email, address, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [c.id, c.name, c.phone, c.email, c.address, new Date(c.createdAt), new Date(c.updatedAt)]
            );
        }
        console.log(`✅ Imported ${data.clients.length} Clients`);

        // 4. Orders
        for (const o of data.orders) {
            await client.query(
                'INSERT INTO "Order" (id, "orderNumber", "clientId", status, "totalAmount", "finalAmount", advance, "additionalServices", "additionalServicesAmount", "additionalServicesCost", "trialDate", "deliveryDate", measurements, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)',
                [o.id, o.orderNumber, o.clientId, o.status, o.totalAmount, o.finalAmount, o.advance, o.additionalServices, o.additionalServicesAmount, o.additionalServicesCost, o.trialDate ? new Date(o.trialDate) : null, o.deliveryDate ? new Date(o.deliveryDate) : null, o.measurements, new Date(o.createdAt), new Date(o.updatedAt)]
            );
        }
        console.log(`✅ Imported ${data.orders.length} Orders`);

        // 5. OrderItems
        for (const i of data.orderItems) {
            await client.query(
                'INSERT INTO "OrderItem" (id, "orderId", "garmentTypeId", quantity, price, cost, subtotal, "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [i.id, i.orderId, i.garmentTypeId, i.quantity, i.price, i.cost, i.subtotal, new Date(i.createdAt)]
            );
        }
        console.log(`✅ Imported ${data.orderItems.length} OrderItems`);

        // 6. AdditionalServices
        for (const s of data.additionalServices) {
            await client.query(
                'INSERT INTO "AdditionalService" (id, "orderId", description, amount, cost, "createdAt") VALUES ($1, $2, $3, $4, $5, $6)',
                [s.id, s.orderId, s.description, s.amount, s.cost, new Date(s.createdAt)]
            );
        }

        // 7. SpecialRequirements
        for (const r of data.specialRequirements) {
            await client.query(
                'INSERT INTO "SpecialRequirement" (id, "orderId", note, "imageUrl", "createdAt") VALUES ($1, $2, $3, $4, $5)',
                [r.id, r.orderId, r.note, r.imageUrl, new Date(r.createdAt)]
            );
        }

        // 8. TrialNotes
        for (const t of data.trialNotes) {
            await client.query(
                'INSERT INTO "TrialNote" (id, "orderId", note, "imageUrl", "createdAt") VALUES ($1, $2, $3, $4, $5)',
                [t.id, t.orderId, t.note, t.imageUrl, new Date(t.createdAt)]
            );
        }

        // 9. Invoices
        for (const inv of data.invoices) {
            await client.query(
                'INSERT INTO "Invoice" (id, "orderId", "invoiceNumber", "pdfPath", "createdAt") VALUES ($1, $2, $3, $4, $5)',
                [inv.id, inv.orderId, inv.invoiceNumber, inv.pdfPath, new Date(inv.createdAt)]
            );
        }
        console.log(`✅ Imported Invoices and Details`);

        // 10. Messages
        for (const m of data.messages) {
            await client.query(
                'INSERT INTO "Message" (id, "clientId", type, content, status, "sentAt", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [m.id, m.clientId, m.type, m.content, m.status, m.sentAt ? new Date(m.sentAt) : null, new Date(m.createdAt)]
            );
        }

        // 11. Measurement Templates
        for (const mt of data.measurementTemplates) {
            await client.query(
                'INSERT INTO "MeasurementTemplate" (id, name, "clientId", "garmentTypeId", measurements, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [mt.id, mt.name, mt.clientId, mt.garmentTypeId, mt.measurements, new Date(mt.createdAt), new Date(mt.updatedAt)]
            );
        }

        console.log('🎉 Migration Complete!');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

restore();
