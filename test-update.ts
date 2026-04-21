import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function test() {
    try {
        const user = await db.user.findFirst();
        if (!user) {
            console.log("No user found");
            return;
        }
        console.log("Found user:", user.email);
        const updated = await db.user.update({
            where: { id: user.id },
            data: { password: user.password } // Just try updating with the same value
        });
        console.log("Update success!");
    } catch (error) {
        console.error("Update failed:", error);
    } finally {
        await db.$disconnect();
    }
}

test();
