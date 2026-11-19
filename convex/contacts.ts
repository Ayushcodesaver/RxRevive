import { v } from "convex/values";
import { mutation } from "./_generated/server";

/** Contact messages: public mutation, deliberately narrow.
 * It writes one message row and nothing else; rate limiting happens in the
 * Next.js route. No read function is public — admins read via the dashboard. */

export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    subject: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("contact_messages", {
      name: args.name.slice(0, 120),
      email: args.email.slice(0, 255),
      subject: (args.subject || "Feedback").slice(0, 200),
      message: args.message.slice(0, 5000),
      status: "new",
      createdAt: Date.now(),
    });
  },
});
