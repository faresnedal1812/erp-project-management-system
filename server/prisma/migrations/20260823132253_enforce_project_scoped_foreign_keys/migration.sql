/*
  Warnings:

  - A unique constraint covering the columns `[id,projectId]` on the table `milestones` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,projectId]` on the table `tasks` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_milestoneId_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_parentId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "milestones_id_projectId_key" ON "milestones"("id", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_id_projectId_key" ON "tasks"("id", "projectId");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_milestoneId_projectId_fkey" FOREIGN KEY ("milestoneId", "projectId") REFERENCES "milestones"("id", "projectId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parentId_projectId_fkey" FOREIGN KEY ("parentId", "projectId") REFERENCES "tasks"("id", "projectId") ON DELETE RESTRICT ON UPDATE CASCADE;
