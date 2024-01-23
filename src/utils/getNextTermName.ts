import { db } from './db.server';

export async function getNextTermName() {
    // Retrieve the most recent term from the database
    const lastTerm = await db.term.findFirst({
        orderBy: {
            createdAt: 'desc'
        }
    });

    const currentYear = new Date().getFullYear();

    // If there's no term in the database, or the last term is from a previous year, start with Q1 of the current year
    if (!lastTerm || parseInt(lastTerm.name.split('-')[1]) < currentYear) {
        return `T1-${currentYear}`;
    }

    // Extract the quarter and year from the last term's name
    const [lastTermName, lastYear] = lastTerm.name.split('-');
    const termNumber = parseInt(lastTermName.substring(1));
    const yearNumber = parseInt(lastYear);

    // Calculate the next term's quarter and year
    let nextTermNumber = termNumber + 1;
    let nextYearNumber = yearNumber;

    // If the quarter number exceeds 4, reset to 1 and increment the year

    // console.log(`T${nextTermNumber}-${nextYearNumber}`);
    // Return the next term name
    return `T${nextTermNumber}-${nextYearNumber}`;
}
