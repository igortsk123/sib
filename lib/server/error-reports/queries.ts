import "server-only"
import { desc, eq, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { errorReport, guaranteeLetter } from "@/lib/db/schema"

export async function listErrorReports() {
  return db()
    .select({
      id: errorReport.id,
      letterId: errorReport.letterId,
      message: errorReport.message,
      reporterEmail: errorReport.reporterEmail,
      status: errorReport.status,
      resolutionNote: errorReport.resolutionNote,
      notifiedAt: errorReport.notifiedAt,
      createdAt: errorReport.createdAt,
      patient: guaranteeLetter.patientFullName,
    })
    .from(errorReport)
    .leftJoin(guaranteeLetter, eq(guaranteeLetter.id, errorReport.letterId))
    .orderBy(desc(errorReport.createdAt))
    .limit(500)
}

export async function countOpenReports(): Promise<number> {
  const r = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(errorReport)
    .where(eq(errorReport.status, "open"))
  return r[0]?.n ?? 0
}
