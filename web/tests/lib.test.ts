import { describe, expect, it } from "vitest";
import { scoreClass, modelLabel } from "@/lib/api/client";
import { analyzeSchema, contactSchema } from "@/lib/validation/schemas";
import { config } from "@/lib/config";

describe("scoreClass", () => {
  it("bands scores honestly", () => {
    expect(scoreClass(90)).toBe("high");
    expect(scoreClass(60)).toBe("mid");
    expect(scoreClass(20)).toBe("low");
    expect(scoreClass(null)).toBe("");
    expect(scoreClass(undefined)).toBe("");
  });
});

describe("modelLabel", () => {
  it("maps engine keys to names", () => {
    expect(modelLabel("traditional")).toBe("Traditional NLP");
    expect(modelLabel("transformer")).toBe("Transformer NLP");
    expect(modelLabel("compare")).toBe("Comparison");
    expect(modelLabel("unknown")).toBe("unknown");
  });
});

describe("config flags", () => {
  it("exposes honest integration flags", () => {
    expect(typeof config.clerkConfigured).toBe("boolean");
    expect(typeof config.convexConfigured).toBe("boolean");
    expect(config.apiUrl).toBeTruthy();
    expect(config.clerkConfigured).toBe(Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY));
  });
});

describe("analyzeSchema", () => {
  it("rejects short documents", () => {
    const result = analyzeSchema.safeParse({
      resume_text: "too short",
      job_description: "also short",
      model: "traditional",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid analyze request", () => {
    const text = "x".repeat(100);
    const result = analyzeSchema.safeParse({
      resume_text: text,
      job_description: text,
      model: "compare",
      job_title: "",
      company: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown model", () => {
    const result = analyzeSchema.safeParse({
      resume_text: "x".repeat(100),
      job_description: "x".repeat(100),
      model: "quantum",
    });
    expect(result.success).toBe(false);
  });
});

describe("contactSchema", () => {
  it("requires a valid email and a real message", () => {
    const bad = contactSchema.safeParse({ name: "T", email: "not-an-email", message: "hi" });
    expect(bad.success).toBe(false);
    const good = contactSchema.safeParse({
      name: "Test User",
      email: "test@example.com",
      subject: "",
      message: "A message longer than ten characters.",
    });
    expect(good.success).toBe(true);
  });
});
