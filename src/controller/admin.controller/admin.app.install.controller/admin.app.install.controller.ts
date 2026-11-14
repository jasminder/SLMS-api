import { Request, Response } from 'express';
import { addRelease, getInstallReport, getNotInstalledAccounts, getStudentAppRecord, listReleases } from '../../../service/app.install.service/app.install.service';
import { customError } from '../../../utils/customError';

/* Scope of Work item 25: admin reads of who has the app, plus our own release list */
export const getInstallReportHandler = async (_req: Request, res: Response) => {
    res.status(200).json(await getInstallReport());
};

export const getNotInstalledHandler = async (_req: Request, res: Response) => {
    res.status(200).json(await getNotInstalledAccounts());
};

export const getStudentAppRecordHandler = async (req: Request<{ studentId: string }>, res: Response) => {
    const studentId = Number(req.params.studentId);
    if (!Number.isInteger(studentId)) throw customError('Student id is not valid.', 'fail', 400, true);
    res.status(200).json(await getStudentAppRecord(studentId));
};

export const listReleasesHandler = async (_req: Request, res: Response) => {
    res.status(200).json(await listReleases());
};

export const addReleaseHandler = async (req: Request, res: Response) => {
    const { platform, version, build, releasedAt, notes } = req.body ?? {};
    const release = await addRelease({ platform: String(platform ?? ''), version: String(version ?? ''), build: Number(build), releasedAt: String(releasedAt ?? ''), notes: notes ? String(notes) : undefined });
    res.status(201).json(release);
};
