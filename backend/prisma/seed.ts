import { PrismaClient, VenueRole } from '@prisma/client';

const prisma = new PrismaClient();

// Minimal fixture so `npm run seed` gives you something to click through
// immediately: one venue, one category with two items (one with modifiers),
// one table. Replace SEED_USER_ID with a real Supabase auth.users id from
// your project (sign up once via the frontend, then copy your user id from
// Supabase's Auth table) so the venue is owned by an account you can log in
// as.
const SEED_USER_ID = '106e57c5-a328-4bcb-af2c-8debbb67cc62';
const SEED_USER_EMAIL = 'drilon-saiti@hotmail.com';

async function main() {
    await prisma.user.upsert({
        where: { id: SEED_USER_ID },
        update: {},
        create: { id: SEED_USER_ID, email: SEED_USER_EMAIL },
    });

    const venue = await prisma.venue.create({
        data: {
            name: "Mario's Pizzeria",
            slug: 'marios-pizzeria',
            type: 'restaurant',
            brandColor: '#c0392b',
            memberships: { create: { userId: SEED_USER_ID, role: VenueRole.OWNER } },
        },
    });

    const mains = await prisma.menuCategory.create({
        data: { venueId: venue.id, name: 'Pizzas', displayOrder: 0 },
    });

    await prisma.menuItem.create({
        data: {
            venueId: venue.id,
            categoryId: mains.id,
            name: 'Margherita',
            description: 'Tomato, mozzarella, basil',
            priceCents: 1200,
            modifierGroups: {
                create: [
                    {
                        name: 'Size',
                        isRequired: true,
                        minSelect: 1,
                        maxSelect: 1,
                        options: {
                            create: [
                                { name: 'Medium', priceDeltaCents: 0, displayOrder: 0 },
                                { name: 'Large', priceDeltaCents: 300, displayOrder: 1 },
                            ],
                        },
                    },
                ],
            },
        },
    });

    await prisma.menuItem.create({
        data: {
            venueId: venue.id,
            categoryId: mains.id,
            name: 'Pepperoni',
            priceCents: 1400,
        },
    });

    await prisma.table.create({ data: { venueId: venue.id, label: 'Table 1' } });
    await prisma.table.create({ data: { venueId: venue.id, label: 'Table 2' } });

    console.log(`Seeded venue "${venue.name}" (${venue.slug}) for user ${SEED_USER_ID}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());