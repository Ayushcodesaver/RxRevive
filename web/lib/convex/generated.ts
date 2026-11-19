// Convex function references for the web app.
//
// After `npx convex dev` runs for the first time, the generated module at
// convex/_generated/api is the source of truth (imports can then switch to
// it directly). This file mirrors that shape so the app builds and runs
// before a deployment exists; the runtime calls resolve against the deployed
// backend by function path.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ref(path: string): any {
  return { __ref: path };
}

export const api = {
  users: {
    syncUser: ref("users/syncUser"),
    getUser: ref("users/getUser"),
  },
  analyses: {
    create: ref("analyses/create"),
    markFailed: ref("analyses/markFailed"),
    listForUser: ref("analyses/listForUser"),
    getOwned: ref("analyses/getOwned"),
    removeOwned: ref("analyses/removeOwned"),
    statsForUser: ref("analyses/statsForUser"),
  },
  datasets: {
    create: ref("datasets/create"),
    listForUser: ref("datasets/listForUser"),
    getOwned: ref("datasets/getOwned"),
    removeOwned: ref("datasets/removeOwned"),
  },
  evaluations: {
    create: ref("evaluations/create"),
    listForUser: ref("evaluations/listForUser"),
    getOwned: ref("evaluations/getOwned"),
  },
  experiments: {
    create: ref("experiments/create"),
    listForUser: ref("experiments/listForUser"),
    removeOwned: ref("experiments/removeOwned"),
  },
  contacts: {
    create: ref("contacts/create"),
  },
};

export type Id<TableName extends string> = string & { __table: TableName };
