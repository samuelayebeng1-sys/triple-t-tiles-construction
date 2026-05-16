import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, issuesTable } from "@workspace/db";
import { ListIssuesResponse, ResolveIssueParams, ResolveIssueResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/issues", async (_req, res): Promise<void> => {
  const issues = await db.select().from(issuesTable).orderBy(issuesTable.id);
  res.json(ListIssuesResponse.parse(issues));
});

router.post("/issues/:id/resolve", async (req, res): Promise<void> => {
  const params = ResolveIssueParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [issue] = await db
    .update(issuesTable)
    .set({ resolved: true })
    .where(eq(issuesTable.id, params.data.id))
    .returning();

  if (!issue) {
    res.status(404).json({ error: "Issue not found" });
    return;
  }

  res.json(ResolveIssueResponse.parse(issue));
});

export default router;
