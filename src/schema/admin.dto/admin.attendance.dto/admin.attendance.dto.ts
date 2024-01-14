import { z } from "zod";

export const closeSkipReportTodaySchema = z.object({
    body: z.object({
        closingRemark: z.string()
    }),
    params: z.object({
        skipReportId: z.string().min(1, { message: 'Atleast one param string value required @ksm' })
    })
});
export type CloseSkipReportTodaySchema = z.infer<typeof closeSkipReportTodaySchema>;
