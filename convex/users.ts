import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** User sync: a users row is created/refreshed on first authenticated visit.
 * clerkUserId is the canonical identity across every table. */

export const syncUser = mutation({
  args: { clerkUserId: v.string(), name: v.string(), email: v.string(), image: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        email: args.email,
        image: args.image,
        updatedAt: now,
      });
      return existing._id;
    }
    // the very first user becomes the admin (documented in BUILD_STATUS.md)
    const anyUser = await ctx.db.query("users").first();
    return ctx.db.insert("users", {
      clerkUserId: args.clerkUserId,
      name: args.name,
      email: args.email,
      image: args.image,
      role: anyUser ? "user" : "admin",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getUser = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .unique();
  },
});
