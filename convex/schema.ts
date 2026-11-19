import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/** RxRevive Convex schema.
 *
 * Identity: Clerk user ids are the canonical identity; a users row is synced
 * on first sign-in. Every private table carries clerkUserId and every
 * function filters on it — a user never reads another user's records.
 * Binaries (resume files, dataset CSVs, report PDFs) live in file storage;
 * documents hold references and extracted text where justified.
 */

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
    role: v.union(v.literal("user"), v.literal("admin")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_id", ["clerkUserId"]),

  resumes: defineTable({
    clerkUserId: v.string(),
    filename: v.string(),
    fileType: v.string(),
    fileHash: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    extractedText: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    createdAt: v.number(),
  })
    .index("by_user", ["clerkUserId"])
    .index("by_user_and_hash", ["clerkUserId", "fileHash"]),

  jobs: defineTable({
    clerkUserId: v.string(),
    title: v.string(),
    company: v.optional(v.string()),
    description: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["clerkUserId"]),

  analyses: defineTable({
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
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    errorMessage: v.optional(v.string()),
    results: v.any(),
    createdAt: v.number(),
  })
    .index("by_user", ["clerkUserId"])
    .index("by_user_and_time", ["clerkUserId", "createdAt"]),

  reports: defineTable({
    clerkUserId: v.string(),
    analysisId: v.id("analyses"),
    filename: v.string(),
    storageRef: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["clerkUserId"])
    .index("by_analysis", ["analysisId"]),

  datasets: defineTable({
    clerkUserId: v.string(),
    datasetName: v.string(),
    source: v.optional(v.string()),
    fileRef: v.optional(v.string()),
    totalRecords: v.number(),
    validRecords: v.number(),
    invalidRecords: v.number(),
    labelColumn: v.optional(v.string()),
    labelDistribution: v.optional(v.any()),
    validationReport: v.optional(v.any()),
    content: v.optional(v.string()),
    status: v.union(v.literal("validating"), v.literal("ready"), v.literal("failed")),
    createdAt: v.number(),
  }).index("by_user", ["clerkUserId"]),

  evaluations: defineTable({
    clerkUserId: v.string(),
    datasetId: v.id("datasets"),
    engineName: v.string(),
    accuracy: v.optional(v.number()),
    precision: v.optional(v.number()),
    recall: v.optional(v.number()),
    f1Score: v.optional(v.number()),
    confusionMatrix: v.optional(v.any()),
    evaluatedRecords: v.number(),
    splitConfiguration: v.any(),
    results: v.any(),
    createdAt: v.number(),
  })
    .index("by_user", ["clerkUserId"])
    .index("by_dataset", ["datasetId"]),

  experiments: defineTable({
    clerkUserId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    modelVersion: v.optional(v.string()),
    datasetId: v.optional(v.id("datasets")),
    configuration: v.optional(v.any()),
    results: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_user", ["clerkUserId"])
    .index("by_user_and_time", ["clerkUserId", "createdAt"]),

  contact_messages: defineTable({
    name: v.string(),
    email: v.string(),
    subject: v.string(),
    message: v.string(),
    status: v.union(v.literal("new"), v.literal("read"), v.literal("archived")),
    createdAt: v.number(),
  }).index("by_status", ["status"]),
});
