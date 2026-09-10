import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    `DELETE FROM _prisma_migrations WHERE migration_name = '20260905162855_add_one_active_timer_index'`,
  );
  console.log("Deleted old migration record");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
