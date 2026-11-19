import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** Experiments: reproducible research runs (seed, split, model version). */

export const create = mutation({
  args: {
    clerkUserId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    modelVersion: v.optional(v.string()),
    datasetId: v.optional(v.id("datasets")),
    configuration: v.optional(v.any()),
    results: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("experiments", { ...args, createdAt: Date.now() });
  },
});

export const listForUser = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("experiments")
      .withIndex("by_user_and_time", (q) => q.eq("clerkUserId", args.clerkUserId))
      .order("desc")
      .collect();
  },
});

export const removeOwned = mutation({
  args: { clerkUserId: v.string(), id: v.id("experiments") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.id);
    if (!record || record.clerkUserId !== args.clerkUserId) throw new Error("Not found or not yours.");
    await ctx.db.delete(args.id);
  },
});
