-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "courseNumber" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "firedCourseNumbers" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "courseNumber" INTEGER NOT NULL DEFAULT 1;
