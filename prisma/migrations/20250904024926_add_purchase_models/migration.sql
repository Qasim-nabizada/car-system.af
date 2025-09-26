-- CreateTable
CREATE TABLE "public"."purchase_containers" (
    "id" TEXT NOT NULL,
    "containerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "rent" DOUBLE PRECISION NOT NULL,
    "grandTotal" DOUBLE PRECISION NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_containers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_contents" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "recovery" DOUBLE PRECISION NOT NULL,
    "cutting" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "containerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_contents_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."purchase_containers" ADD CONSTRAINT "purchase_containers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_contents" ADD CONSTRAINT "purchase_contents_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "public"."purchase_containers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
