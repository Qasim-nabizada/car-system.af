import { PrismaClient } from "@prisma/client";

// جلوگیری از ساخت چندین نمونه PrismaClient در حالت توسعه
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;