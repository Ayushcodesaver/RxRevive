import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** Analyses: create (pending -> completed), list, read, delete.
 * Every function filters by clerkUserId; ownership is non-negotiable. */

export const create = mutation({
  args: {
    clerkUserId: v.string(),
    engine: v.union(v.literal("traditional"), v.literal("transformer"), v.literal("compare")),
    jobTitle: v.optional(v.string()),
    company: v.optional(v.string()),
    traditionalScore: v.optional(v.number()),
    transformerScore: v.optional(v.number()),
    similarity: v.number(),
    skillCoverage: v.number(),
    matchedSkills: v.array(v.string()),
    missingSkills: v.array(v.string()),
    processingTime: v.number(),
    modelName: v.string(),
    results: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("analyses", {
      clerkUserId: args.clerkUserId,
      engine: args.engine,
      jobTitle: args.jobTitle,
      company: args.company,
      traditionalScore: args.traditionalScore ?? null,
      transformerScore: args.transformerScore ?? null,
      similarity: args.similarity,
      skillCoverage: args.skillCoverage,
      matchedSkills: args.matchedSkills,
      missingSkills: args.missingSkills,
      processingTime: args.processingTime,
      modelName: args.modelName,
      status: "completed",
      results: args.results,
      createdAt: now,
    });
  },
});

export const markFailed = mutation({
  args: { id: v.id("analyses"), errorMessage: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.id);
    if (!record) throw new Error("Analysis not found.");
    await ctx.db.patch(args.id, { status: "failed", errorMessage: args.errorMessage });
  },
});

export const listForUser = query({
  args: { clerkUserId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("analyses")
      .withIndex("by_user_and_time", (q) => q.eq("clerkUserId", args.clerkUserId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const getOwned = query({
  args: { clerkUserId: v.string(), id: v.id("analyses") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.id);
    if (!record || record.clerkUserId !== args.clerkUserId) return null;
    return record;
  },
});

export const removeOwned = mutation({
  args: { clerkUserId: v.string(), id: v.id("analyses") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.id);
    if (!record || record.clerkUserId !== args.clerkUserId) {
      throw new Error("Not found or not yours.");
    }
    // remove dependent reports (their files are cleaned by the storage job)
    const reports = await ctx.db
      .query("reports")
      .withIndex("by_analysis", (q) => q.eq("analysisId", args.id))
      .collect();
    for (const report of reports) {
      if (report.clerkUserId === args.clerkUserId) await ctx.db.delete(report._id);
    }
    await ctx.db.delete(args.id);
  },
});

export const statsForUser = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("analyses")
      .withIndex("by_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .collect();
    const scored = rows.filter((r) => r.traditionalScore != null || r.transformerScore != null);
    const scores = scored.flatMap((r) => [r.traditionalScore, r.transformerScore].filter((s) => s != null) as number[]);
    return {
      total: rows.length,
      comparisons: rows.filter((r) => r.engine === "compare").length,
      traditionalRuns: rows.filter((r) => r.traditionalScore != null).length,
      transformerRuns: rows.filter((r) => r.transformerScore != null).length,
      averageScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      highestScore: scores.length ? Math.max(...scores) : null,
      recent: rows.slice(0, 10),
    };
  },
});
