# Dummy Data Ingestion

Script: `ingest-dummy-data.ts`

Populates the system with realistic test data for end-to-end testing: students, invoices (fee payments), payments (installments), attendance, leaves, notices, and events. All data is tagged so it can be reset without affecting real records.

## Quick start

From `SLMS-apis`:

```bash
# Ingest dummy data (creates students, invoices, payments, attendance, etc.)
npm run ingest-dummy-data

# Remove all dummy data only
npm run ingest-dummy-data:reset

# Reset then re-ingest (full re-generate)
npm run ingest-dummy-data:full
```

Or with `npx ts-node`:

```bash
npx ts-node prisma/ingest-dummy-data.ts              # Ingest
npx ts-node prisma/ingest-dummy-data.ts --reset     # Reset only
npx ts-node prisma/ingest-dummy-data.ts --full      # Reset + ingest
```

Env equivalents: `RESET_DUMMY_DATA=1`, `FULL_RESET=1`.

## What gets created

| Data | Description |
|------|-------------|
| **Students** | 12 students with personal, parents, emergency, health, other info (emails `*@slms-dummy.test`) |
| **Enrollments** | Each student enrolled in current term, Kirtan class, Section A |
| **Invoices** | Term fee (1 per student) + 4 monthly fee templates; each student gets corresponding FeePayments |
| **Payments** | **Paid**: 4 term invoices + several monthly fully paid; **Overdue**: 3 first-month invoices; **Partial**: 1 with half paid; **Pending**: remaining |
| **Attendance** | 5 past weekdays with school check-in and class attendance (present/absent mix) |
| **Leaves** | 2 leave applications (1 PENDING, 1 APPROVED) |
| **Notices** | 2 student notices (if an admin exists) |
| **Events** | 2 events (assembly, parent evening) |

Relationships are maintained: Student → Enrollment → StudentTermFee → FeePayment → PaymentInstallment; attendance links to students and class assignments.

## Reset behaviour

- **Reset** deletes only data created by this script (identified by `@slms-dummy.test` emails and “Dummy ingest” / “Dummy …” tags).
- **Ingest** skips creation if dummy students already exist unless you use `--full`.
- **Full** runs reset then ingest for a clean re-generation.

## Where to see the data

- **Enrolled Students** (Admin → Students → Enrolled Student List): Shows students enrolled in the published term. The script sets the current term as published, so the list will load.
- **Active Students** (Admin → Students → Active Students List): Uses the current term; the term dropdown should default to the current term and show the dummy students.
- **Fee / Invoices**: Open a student from the list → Fee / Manage Fee to see Paid, Pending, and Overdue invoices and payment installments.
- **Attendance, Leaves, Notices**: Available from the same student detail pages.

## Timetable

For timetable data, run the timetable ingest separately (e.g. `npm run ingest-timetable` with `prisma/timetable-ingest.json`).

## Prerequisites

- Database migrated (`npx prisma migrate deploy`).
- At least one **Admin** in the system if you want dummy student notices to be created.
