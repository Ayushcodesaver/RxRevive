import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** Datasets: metadata + cleaned records preview stored, full CSV in storage.
 * Ownership checks on every read/write. */

export const create = mutation({
  args: {
    clerkUserId: v.string(),
    datasetName: v.string(),
    source: v.optional(v.string()),
    totalRecords: v.number(),
    validRecords: v.number(),
    invalidRecords: v.number(),
    labelColumn: v.optional(v.string()),
    labelDistribution: v.optional(v.any()),
    validationReport: v.optional(v.any()),
    content: v.string(),
    status: v.union(v.literal("validating"), v.literal("ready"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("datasets", { ...args, createdAt: Date.now() });
  },
});

export const listForUser = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("datasets")
      .withIndex("by_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .order("desc")
      .collect();
  },
});

export const getOwned = query({
  args: { clerkUserId: v.string(), id: v.id("datasets") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.id);
    if (!record || record.clerkUserId !== args.clerkUserId) return null;
    return record;
  },
});

export const removeOwned = mutation({
  args: { clerkUserId: v.string(), id: v.id("datasets") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.id);
    if (!record || record.clerkUserId !== args.clerkUserId) throw new Error("Not found or not yours.");
    await ctx.db.delete(args.id);
  },
});
