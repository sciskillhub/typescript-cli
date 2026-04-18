import { describe, expect, test } from "vitest";
import { __test__ } from "../../src/lib/client.js";

describe("catalog query filtering", () => {
  test("matches multi-token CNV query across name and description", () => {
    const skills = [
      {
        id: "1",
        name: "bio-copy-number-cnvkit-analysis",
        slug: "open-source/foo/bio-copy-number-cnvkit-analysis",
        description: "Call copy number variants from targeted and exome sequencing using CNVkit.",
      },
      {
        id: "2",
        name: "single-cell-clustering",
        slug: "open-source/foo/single-cell-clustering",
        description: "Cluster and visualize single-cell transcriptomics data.",
      },
    ];

    const result = __test__.filterCatalogSkills(skills, "CNV copy number variation");
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("bio-copy-number-cnvkit-analysis");
  });

  test("matches partial token query instead of requiring exact phrase", () => {
    const skill = {
      id: "1",
      name: "cnv-caller-agent",
      slug: "open-source/foo/cnv-caller-agent",
      description: "Analyze copy number variation from WGS, WES, or targeted sequencing.",
    };

    expect(__test__.scoreCatalogSkill(skill, "copy number")).not.toBeNull();
    expect(__test__.scoreCatalogSkill(skill, "CNV copy number single cell")).not.toBeNull();
  });
});
