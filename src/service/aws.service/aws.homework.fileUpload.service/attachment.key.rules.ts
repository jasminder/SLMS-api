/**
 * Issue 12 (Bug B): the extension of the stored key for a homework / classwork attachment.
 *
 * The key is `<file name>-<random id>.<extension>`. It used to take the extension from the MIME type (the part after the "/"),
 * which for Word files is "vnd.openxmlformats-officedocument.wordprocessingml.document" and for AVI / MKV is "x-msvideo" /
 * "x-matroska". Those contain hyphens and dots, so every reader that finds the random id by the LAST hyphen (the web lists, the
 * mobile app, the daily e-mail) left the id in the displayed name, and a downloaded Word file ended in ".document".
 *
 * Rule: use the extension of the ORIGINAL file name when it is 1 to 10 letters or digits (lower-cased). Otherwise keep the old
 * MIME-subtype value, so nothing that worked before changes. Pure and import-free so it can be unit-tested without AWS.
 */
const NAME_EXTENSION = /\.([A-Za-z0-9]{1,10})$/;

export const attachmentKeyExtension = (fileName: string, mimeSubtype: string): string => {
    const match = NAME_EXTENSION.exec(fileName);
    return match ? match[1].toLowerCase() : mimeSubtype;
};
