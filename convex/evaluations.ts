import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** Evaluations: stored metric sets from the Python service, per user. */

export const create = mutation({
  args: {
    clerkUserId: v.string(),
    datasetId: v.id("datasets"),
    results: v.any(),
    evaluatedRecords: v.number(),
    splitConfiguration: v.any(),
    engineName: v.string(),
  },
  handler: async (ctx, args) => {
    const results = args.results as Record<string, { metrics?: Record<string, number | null> }>;
    const single = results.traditional || results.transformer;
    const metrics = single?.metrics ?? {};
    return ctx.db.insert("evaluations", {
      clerkUserId: args.clerkUserId,
      datasetId: args.datasetId,
      engineName: args.engineName,
      accuracy: (metrics.accuracy as number) ?? null,
      precision: (metrics.precision_macro as number) ?? null,
      recall: (metrics.recall_macro as number) ?? null,
      f1Score: (metrics.f1_macro as number) ?? null,
      confusionMatrix: metrics.confusion_matrix ?? null,
      evaluatedRecords: args.evaluatedRecords,
      splitConfiguration: args.splitConfiguration,
      results: args.results,
      createdAt: Date.now(),
    });
  },
});

export const listForUser = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("evaluations")
      .withIndex("by_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .order("desc")
      .collect();
  },
});

export const getOwned = query({
  args: { clerkUserId: v.string(), id: v.id("evaluations") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.id);
    if (!record || record.clerkUserId !== args.clerkUserId) return null;
    return record;
  },
});
