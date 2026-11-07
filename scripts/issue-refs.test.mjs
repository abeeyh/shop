import { describe, expect, it } from "vitest";
import { issueRefs, labelPlan } from "./issue-refs.mjs";

describe("issue-refs", () => {
  it("acha Refs/Closes/Fixes/Resolves, sem repetir, ignorando número de PR no título", () => {
    const log = "feat(db): banco (#43)\n\nRefs #7\n\nfix: x\n\nrefs #7\nCloses #12\nFixes #3";
    expect(issueRefs(log)).toEqual([3, 7, 12]);
  });

  it("não confunde #N solto com referência", () => {
    expect(issueRefs("chore(deps): bump x (#38)")).toEqual([]);
  });

  it("dev → hom → prod; só main fecha a issue", () => {
    expect(labelPlan("dev")).toEqual({ add: "dev", remove: [], close: false });
    expect(labelPlan("hom")).toEqual({ add: "hom", remove: ["dev"], close: false });
    expect(labelPlan("main")).toEqual({ add: "prod", remove: ["dev", "hom"], close: true });
    expect(labelPlan("feat/1-x")).toBeNull();
  });
});
