-- CreateTable
CREATE TABLE "Admin" (
    "id" SERIAL NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAllowedLogin" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminPersonalDetails" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "DOB" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "suburb" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "image" TEXT,

    CONSTRAINT "AdminPersonalDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminEmergencyContact" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,

    CONSTRAINT "AdminEmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminWWCHealthInformation" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "medicareNumber" TEXT DEFAULT 'Medicare Number not provided',
    "medicalCondition" TEXT NOT NULL,
    "childrenCheckCardNumber" TEXT NOT NULL,
    "workingWithChildrenCheckExpiry" TIMESTAMP(3) NOT NULL,
    "workingwithChildrenCheckCardPhotoImage" TEXT,

    CONSTRAINT "AdminWWCHealthInformation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminWorkRights" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "workRights" BOOLEAN NOT NULL,
    "immigrationStatus" TEXT NOT NULL,

    CONSTRAINT "AdminWorkRights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminBankDetails" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "bankAccountName" TEXT NOT NULL,
    "BSB" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "ABN" TEXT DEFAULT 'NA',

    CONSTRAINT "AdminBankDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminOtherInformation" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "otherInfo" TEXT NOT NULL DEFAULT 'No information provided',

    CONSTRAINT "AdminOtherInformation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminPersonalDetails_adminId_key" ON "AdminPersonalDetails"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminPersonalDetails_email_key" ON "AdminPersonalDetails"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminPersonalDetails_contact_key" ON "AdminPersonalDetails"("contact");

-- CreateIndex
CREATE UNIQUE INDEX "AdminEmergencyContact_adminId_key" ON "AdminEmergencyContact"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminWWCHealthInformation_adminId_key" ON "AdminWWCHealthInformation"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminWWCHealthInformation_childrenCheckCardNumber_key" ON "AdminWWCHealthInformation"("childrenCheckCardNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AdminWorkRights_adminId_key" ON "AdminWorkRights"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminBankDetails_adminId_key" ON "AdminBankDetails"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminOtherInformation_adminId_key" ON "AdminOtherInformation"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "AdminPersonalDetails" ADD CONSTRAINT "AdminPersonalDetails_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminEmergencyContact" ADD CONSTRAINT "AdminEmergencyContact_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminWWCHealthInformation" ADD CONSTRAINT "AdminWWCHealthInformation_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminWorkRights" ADD CONSTRAINT "AdminWorkRights_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminBankDetails" ADD CONSTRAINT "AdminBankDetails_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminOtherInformation" ADD CONSTRAINT "AdminOtherInformation_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
