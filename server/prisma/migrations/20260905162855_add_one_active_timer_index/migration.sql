CREATE UNIQUE INDEX "one_active_timer_per_employee" 
ON "time_entries" ("employeeId") 
WHERE "endedAt" IS NULL;