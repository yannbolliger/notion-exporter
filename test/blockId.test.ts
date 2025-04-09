import { blockIdFromUrl, validateUuid } from "../src/blockId"

describe("Validate UUID with and without dashes", () => {
  it("Validates with dashes", () => {
    expect(validateUuid("a981a0c2-68b1-35dc-bcfc-296e52ab01ec")).toEqual(
      "a981a0c2-68b1-35dc-bcfc-296e52ab01ec"
    )
    expect(validateUuid("90123e1c-7512-523e-bb28-76fab9f2f73d")).toEqual(
      "90123e1c-7512-523e-bb28-76fab9f2f73d"
    )
    expect(validateUuid(undefined)).toBeUndefined()
    expect(validateUuid("")).toBeUndefined()
    expect(validateUuid("    ")).toBeUndefined()
    expect(validateUuid("invalid uuid string")).toBeUndefined()
    expect(
      validateUuid(
        "=Y00a-f*v00b*-00c-00d#-p00f\b-00g-00h-####00i^^^-00j*1*2*3&-L00k-\n00l-/00m-----00n-fg000-00p-00r+"
      )
    ).toBeUndefined()
  })

  it("Validates v8 UUIDs (used by Notion)", () => {
    // This UUID has a version 8 characters (8xxx in the third group)
    expect(validateUuid("1cf62d960d7f80c79960c58edb3217fd")).toEqual(
      "1cf62d96-0d7f-80c7-9960-c58edb3217fd"
    )
  })

  it("Validates without dashes", () => {
    expect(validateUuid("e0603b592edc45f7acc7b0cccd6656e1")).toEqual(
      "e0603b59-2edc-45f7-acc7-b0cccd6656e1"
    )
    expect(validateUuid("d9428888122b11e1b85c61cd3cbb3210")).toEqual(
      "d9428888-122b-11e1-b85c-61cd3cbb3210"
    )
    expect(
      validateUuid("d9428888122b11e1b85c61cd3cbb3210000000000000")
    ).toBeUndefined()
    expect(validateUuid("d9428888122b1")).toBeUndefined()
  })
})

describe("Extract UUID from Notion URL", () => {
  it("Leaves an already correct UUID as is", () => {
    expect(blockIdFromUrl("e0603b592edc45f7acc7b0cccd6656e1")).toEqual(
      "e0603b592edc45f7acc7b0cccd6656e1"
    )
    expect(blockIdFromUrl("a981a0c2-68b1-35dc-bcfc-296e52ab01ec")).toEqual(
      "a981a0c2-68b1-35dc-bcfc-296e52ab01ec"
    )
  })
// Notion uses non-standard UUIDs (e.g. version 8), which are valid for their API but not RFC4122
  it("Extracts and accepts v8 UUID from a Notion.so URL", () => {
    expect(
      blockIdFromUrl(
        "https://www.notion.so/Network-Engineering-1cf62d960d7f80c79960c58edb3217fd"
      )
    ).toBe("1cf62d960d7f80c79960c58edb3217fd")
  })

  it("Correctly extracts page UUID from notion.site URL", () => {
    expect(
      blockIdFromUrl(
        "https://extremely-funny-6da.notion.site/Document-4bc7b56833914eb684bd82418dc1bbb2"
      )
    ).toBe("4bc7b56833914eb684bd82418dc1bbb2")

    expect(
      blockIdFromUrl(
        "https://www.notion.so/Notion-Official-83715d7703ee4b8699b5e659a4712dd8"
      )
    ).toBe("83715d7703ee4b8699b5e659a4712dd8")
  })

  it("Correctly extracts DB UUID from notion.site URL", () => {
    expect(
      blockIdFromUrl(
        "https://crazy-cargo-3f7.notion.site/2cb6b1a682f44183bfcc61f0f59d51d3?v=8e1d9421236342889dd71b37c66652bb"
      )
    ).toBe("2cb6b1a682f44183bfcc61f0f59d51d3")
  })
})
