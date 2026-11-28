import { Request, Response } from 'express';
import {
    acknowledgeCharge,
    cancelMandateForUser,
    createSetupSession,
    getMandateForStudent,
    getMandateForUser,
    listChargesNeedingAttention,
    directDebitStripeMode,
    runDirectDebitJob,
    setMandateStatusByAdmin
} from '../../service/directDebit.service/directDebit.service';
import {
    addFamilyAccess,
    describeSchedule,
    getDirectDebitSettings,
    listDirectDebitFamilies,
    listFamilyAccess,
    listRecentCharges,
    nextRunAt,
    removeFamilyAccess,
    searchFamilies,
    updateDirectDebitSettings
} from '../../service/directDebit.service/directDebitSettings.service';
import {
    listDirectDebitEmails,
    previewDirectDebitEmail,
    resetDirectDebitEmail,
    saveDirectDebitEmail,
    sendTestDirectDebitEmail
} from '../../service/directDebit.service/directDebitEmails.service';

// Parent / student login (the family login owns the mandate).
export const getMyDirectDebitHandler = async (req: Request, res: Response) => {
    res.status(200).json(await getMandateForUser(req.user!.id));
};
export const createDirectDebitSetupHandler = async (req: Request, res: Response) => {
    res.status(200).json(
        await createSetupSession(req.user!.id, req.body?.payExistingBalance === true, req.body?.returnTo === 'app' ? 'app' : 'web', req.body?.returnUrl)
    );
};
export const cancelMyDirectDebitHandler = async (req: Request, res: Response) => {
    res.status(200).json(await cancelMandateForUser(req.user!.id, req.user!.email));
};

// Admin
export const getStudentDirectDebitHandler = async (req: Request, res: Response) => {
    res.status(200).json(await getMandateForStudent(Number(req.params.studentId)));
};
export const adminMandateActionHandler = async (req: Request, res: Response) => {
    const updated = await setMandateStatusByAdmin(Number(req.params.mandateId), req.body.action, req.user!.email);
    res.status(200).json({ status: updated.status });
};
export const listDirectDebitAttentionHandler = async (_req: Request, res: Response) => {
    res.status(200).json(await listChargesNeedingAttention());
};
export const acknowledgeDirectDebitChargeHandler = async (req: Request, res: Response) => {
    await acknowledgeCharge(Number(req.params.chargeId), req.user!.email);
    res.status(200).json({ ok: true });
};

// Admin: Administration > Direct Debit
export const getDirectDebitSettingsHandler = async (_req: Request, res: Response) => {
    const settings = await getDirectDebitSettings();
    res.status(200).json({ ...settings, nextRunAt: nextRunAt(settings), schedule: describeSchedule(settings), stripe: directDebitStripeMode() });
};
export const updateDirectDebitSettingsHandler = async (req: Request, res: Response) => {
    const settings = await updateDirectDebitSettings(req.body, req.user!.email);
    res.status(200).json({ ...settings, nextRunAt: nextRunAt(settings), schedule: describeSchedule(settings), stripe: directDebitStripeMode() });
};
export const listDirectDebitFamiliesHandler = async (_req: Request, res: Response) => {
    res.status(200).json(await listDirectDebitFamilies());
};
export const listFamilyAccessHandler = async (_req: Request, res: Response) => {
    res.status(200).json(await listFamilyAccess());
};
export const addFamilyAccessHandler = async (req: Request, res: Response) => {
    res.status(200).json(await addFamilyAccess(req.body.email, req.user!.email));
};
export const removeFamilyAccessHandler = async (req: Request, res: Response) => {
    res.status(200).json(await removeFamilyAccess(Number(req.params.id)));
};
export const searchDirectDebitFamiliesHandler = async (req: Request, res: Response) => {
    res.status(200).json(await searchFamilies(String(req.query.search ?? '')));
};
export const listDirectDebitChargesHandler = async (_req: Request, res: Response) => {
    res.status(200).json(await listRecentCharges(100));
};
export const runDirectDebitNowHandler = async (req: Request, res: Response) => {
    res.status(200).json(await runDirectDebitJob(req.user!.email));
};

// Admin: Administration > Direct Debit > Emails
export const listDirectDebitEmailsHandler = async (_req: Request, res: Response) => {
    res.status(200).json(await listDirectDebitEmails());
};
export const saveDirectDebitEmailHandler = async (req: Request, res: Response) => {
    res.status(200).json(await saveDirectDebitEmail(req.params.key, req.body, req.user!.email));
};
export const resetDirectDebitEmailHandler = async (req: Request, res: Response) => {
    res.status(200).json(await resetDirectDebitEmail(req.params.key));
};
export const previewDirectDebitEmailHandler = async (req: Request, res: Response) => {
    res.status(200).json(previewDirectDebitEmail(req.params.key, req.body ?? undefined));
};
export const sendTestDirectDebitEmailHandler = async (req: Request, res: Response) => {
    res.status(200).json(await sendTestDirectDebitEmail(req.params.key, req.user!.email, req.body ?? undefined));
};
