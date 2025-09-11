-- CreateTable
CREATE TABLE "public"."uae_sales" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "item" TEXT NOT NULL,
    "salePrice" DOUBLE PRECISION NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "containerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uae_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."uae_expends" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "containerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uae_expends_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."uae_sales" ADD CONSTRAINT "uae_sales_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "public"."purchase_containers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."uae_sales" ADD CONSTRAINT "uae_sales_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."uae_expends" ADD CONSTRAINT "uae_expends_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "public"."purchase_containers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."uae_expends" ADD CONSTRAINT "uae_expends_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
