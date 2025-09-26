// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
const bcrypt = require('bcrypt');

const prisma = new PrismaClient()

async function main() {
  const managerPassword = await bcrypt.hash("123456", 10);
  const user1Password = await bcrypt.hash("kabul7788", 10);
  const user2Password = await bcrypt.hash("afghanistan9955", 10);

  await prisma.user.upsert({
    where: { username: "manager" },
    update: {
      password: managerPassword,
      role: "manager",
      name: "Manager",
      isActive: true
    },
    create: {
      username: "manager",
      password: managerPassword,
      role: "manager", 
      name: "Manager",
      isActive: true
    }
  });

  await prisma.user.upsert({
    where: { username: "user1" },
    update: {
      password: user1Password,
      role: "user",
      name: "User One",
      isActive: true
    },
    create: {
      username: "user1",
      password: user1Password,
      role: "user",
      name: "User One",
      isActive: true
    }
  });

  await prisma.user.upsert({
    where: { username: "user2" },
    update: {
      password: user2Password,
      role: "user", 
      name: "User Two",
      isActive: true
    },
    create: {
      username: "user2",
      password: user2Password, 
      role: "user",
      name: "User Two",
      isActive: true
    }
  });

  console.log("Seeding completed. Users:");
  console.log("- manager/123456");
  console.log("- user1/kabul7788");
  console.log("- user2/afghanistan9955");
}

main()
  .then(() => {
    console.log("Seeding completed successfully.");
    process.exit(0);
  })
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });