-- Scope of Work item 25 (who has installed the app): ADDITIVE ONLY.
-- Creates three NEW tables plus their indexes and foreign keys, then copies what is already known from DeviceToken into the
-- new AppInstall table (one row per account and platform, no version yet). It does not alter, drop or rewrite any existing
-- table or row, and it can be rolled back by dropping the three tables.

-- CreateTable
CREATE TABLE "AppInstall" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "platform" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    "lastOpenedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "lastLogoutAt" TIMESTAMP(3),
    "appVersion" TEXT,
    "appBuild" INTEGER,
    "buildFirstSeenAt" TIMESTAMP(3),

    CONSTRAINT "AppInstall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppVersionHistory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "platform" TEXT NOT NULL,
    "appVersion" TEXT,
    "appBuild" INTEGER NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppVersionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppRelease" (
    "id" SERIAL NOT NULL,
    "platform" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "build" INTEGER NOT NULL,
    "releasedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppRelease_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppInstall_platform_idx" ON "AppInstall"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "AppInstall_userId_platform_key" ON "AppInstall"("userId", "platform");

-- CreateIndex
CREATE INDEX "AppVersionHistory_platform_appBuild_idx" ON "AppVersionHistory"("platform", "appBuild");

-- CreateIndex
CREATE UNIQUE INDEX "AppVersionHistory_userId_platform_appBuild_key" ON "AppVersionHistory"("userId", "platform", "appBuild");

-- CreateIndex
CREATE UNIQUE INDEX "AppRelease_platform_build_key" ON "AppRelease"("platform", "build");

-- AddForeignKey
ALTER TABLE "AppInstall" ADD CONSTRAINT "AppInstall_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppVersionHistory" ADD CONSTRAINT "AppVersionHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Starting figure: every student account that already has a notification token counts as having the app, on the platform the
-- token reported. The first time and last time come from the token. Nothing is known about the version yet.
INSERT INTO "AppInstall" ("userId", "platform", "firstSeenAt", "lastSeenAt")
SELECT u."id", lower(dt."platform"), min(dt."createdAt"), max(dt."lastSeen")
FROM "DeviceToken" dt
JOIN "User" u ON u."studentId" = dt."studentId"
WHERE lower(dt."platform") IN ('ios', 'android')
GROUP BY u."id", lower(dt."platform")
ON CONFLICT ("userId", "platform") DO NOTHING;
