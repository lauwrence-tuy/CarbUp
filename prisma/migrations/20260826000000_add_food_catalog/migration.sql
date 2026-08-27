-- AlterTable
ALTER TABLE "FoodLog" ALTER COLUMN "calories" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "protein" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "carbs" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "fat" SET DATA TYPE DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Food" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "barcode" TEXT,
    "caloriesPer100g" DOUBLE PRECISION NOT NULL,
    "proteinPer100g" DOUBLE PRECISION NOT NULL,
    "carbsPer100g" DOUBLE PRECISION NOT NULL,
    "fatPer100g" DOUBLE PRECISION NOT NULL,
    "defaultServingGrams" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "defaultServingLabel" TEXT NOT NULL DEFAULT '100 g',
    "createdBy" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Food_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodServing" (
    "id" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "grams" DOUBLE PRECISION NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodServing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Food_createdBy_idx" ON "Food"("createdBy");

-- CreateIndex
CREATE INDEX "Food_barcode_idx" ON "Food"("barcode");

-- CreateIndex
CREATE INDEX "Food_name_idx" ON "Food"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Food_source_externalId_key" ON "Food"("source", "externalId");

-- CreateIndex
CREATE INDEX "FoodServing_foodId_idx" ON "FoodServing"("foodId");

-- AddForeignKey
ALTER TABLE "Food" ADD CONSTRAINT "Food_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodServing" ADD CONSTRAINT "FoodServing_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE CASCADE ON UPDATE CASCADE;
