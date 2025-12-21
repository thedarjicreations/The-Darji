import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create default garment types
    const garmentTypes = [
        { name: 'Formal Trousers', price: 800, description: 'Custom formal trousers' },
        { name: 'Casual Pants', price: 600, description: 'Casual pants' },
        { name: 'Formal Shirt', price: 700, description: 'Custom formal shirt' },
        { name: 'Casual Shirt', price: 500, description: 'Casual shirt' },
        { name: 'Blazer', price: 2500, description: 'Custom blazer' },
        { name: 'Suit', price: 5000, description: 'Complete suit (3-piece)' },
        { name: 'Kurta', price: 800, description: 'Traditional kurta' },
        { name: 'Sherwani', price: 4000, description: 'Wedding/Special occasion sherwani' }
    ];

    for (const garment of garmentTypes) {
        await prisma.garmentType.upsert({
            where: { name: garment.name },
            update: {},
            create: garment
        });
    }

    console.log('✅ Created default garment types');

    // Create sample client (optional)
    const sampleClient = await prisma.client.upsert({
        where: { phone: '+919999999999' },
        update: {},
        create: {
            name: 'Sample Client',
            phone: '+919999999999',
            email: 'sample@example.com',
            address: '123 Sample Street, Sample City'
        }
    });

    console.log('✅ Created sample client');

    console.log('✨ Seeding complete!');
}

main()
    .catch((e) => {
        console.error('Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
