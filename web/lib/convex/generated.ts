// Convex function references for the web app.
//
// `anyApi` produces REAL function references by path, so calls resolve
// correctly against the deployed backend (polite-caiman-100) without needing
// generated code inside web/. After changing convex/ functions, push with
// `npx convex dev` — the references here follow the function names.

import { anyApi } from "convex/server";
import type { GenericId } from "convex/values";

export const api = anyApi;

export type Id<TableName extends string> = GenericId<TableName>;
