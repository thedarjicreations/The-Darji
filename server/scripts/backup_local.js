import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function backup() {
    console.log('📦 Starting Local Database Backup...');

    const data = {
        users: await prisma.user.findMany(),
        garmentTypes: await prisma.garmentType.findMany(),
        clients: await prisma.client.findMany(),
        orders: await prisma.order.findMany(),
        orderItems: await prisma.orderItem.findMany(),
        additionalServices: await prisma.additionalService.findMany(),
        specialRequirements: await prisma.specialRequirement.findMany(),
        trialNotes: await prisma.trialNote.findMany(),
        invoices: await prisma.invoice.findMany(),
        messages: await prisma.message.findMany(),
        measurementTemplates: await prisma.measurementTemplate.findMany(),
        messageTemplates: await prisma.messageTemplate.findMany(),
    };

    const backupPath = path.join(__dirname, '../../backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));

    console.log(`✅ Backup successful! Saved to: ${backupPath}`);
    console.log(`Summary:`);
    Object.keys(data).forEach(key => {
        console.log(` - ${key}: ${data[key].length} records`);
    });
}

backup()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
