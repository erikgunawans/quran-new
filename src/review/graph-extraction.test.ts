import { describe, expect, test } from "bun:test";
import { parseEdgesResponse, validateEdge } from "./graph-extraction.ts";

const PASSAGE = "His Kursi extends over the heavens and the earth, and their preservation tires Him not.";

describe("validateEdge — Stage 04, pure code, no model in the loop", () => {
  test("accepts a well-formed edge with a real quote", () => {
    const edge = validateEdge(
      {
        predicate: "ABOUT_TOPIC",
        subject_id: "ayah:2:255",
        object: { type: "Topic", label: "Divine sovereignty" },
        evidence_span: "His Kursi extends over the heavens and the earth",
        confidence: 0.86,
      },
      PASSAGE,
    );
    expect(edge).not.toBeNull();
    expect(edge?.predicate).toBe("ABOUT_TOPIC");
  });

  test("accepts a canonical-id object for REFERENCES-style edges", () => {
    const edge = validateEdge(
      {
        predicate: "REFERENCES",
        subject_id: "ayah:2:255",
        object: "ayah:59:22",
        evidence_span: "His Kursi extends over the heavens",
        confidence: 0.7,
      },
      PASSAGE,
    );
    expect(edge?.object).toBe("ayah:59:22");
  });

  test("rejects an off-list predicate — the closed vocabulary is enforced in code, not just the prompt", () => {
    const edge = validateEdge(
      {
        predicate: "IMPLIES",
        subject_id: "ayah:2:255",
        object: { type: "Topic", label: "x" },
        evidence_span: "His Kursi extends over the heavens",
        confidence: 0.5,
      },
      PASSAGE,
    );
    expect(edge).toBeNull();
  });

  test("rejects a fabricated quote — evidence_span must be a real substring of the passage", () => {
    const edge = validateEdge(
      {
        predicate: "ABOUT_TOPIC",
        subject_id: "ayah:2:255",
        object: { type: "Topic", label: "Divine sovereignty" },
        evidence_span: "this text does not appear in the passage at all",
        confidence: 0.9,
      },
      PASSAGE,
    );
    expect(edge).toBeNull();
  });

  test("rejects a missing evidence_span — an edge with no quote never survives, per the spec", () => {
    const edge = validateEdge(
      { predicate: "ABOUT_TOPIC", subject_id: "ayah:2:255", object: { type: "Topic", label: "x" }, confidence: 0.9 },
      PASSAGE,
    );
    expect(edge).toBeNull();
  });

  test("rejects confidence outside [0,1]", () => {
    const edge = validateEdge(
      {
        predicate: "ABOUT_TOPIC",
        subject_id: "ayah:2:255",
        object: { type: "Topic", label: "x" },
        evidence_span: "His Kursi extends over the heavens",
        confidence: 1.5,
      },
      PASSAGE,
    );
    expect(edge).toBeNull();
  });

  test("rejects a malformed object (neither a string id nor {type,label})", () => {
    const edge = validateEdge(
      {
        predicate: "ABOUT_TOPIC",
        subject_id: "ayah:2:255",
        object: { label: "missing type" },
        evidence_span: "His Kursi extends over the heavens",
        confidence: 0.9,
      },
      PASSAGE,
    );
    expect(edge).toBeNull();
  });
});

describe("parseEdgesResponse — never throws on a bad model response", () => {
  test("parses a well-formed response", () => {
    expect(parseEdgesResponse('{"edges":[{"predicate":"MENTIONS"}]}')).toHaveLength(1);
  });

  test("returns [] for non-JSON, instead of throwing", () => {
    expect(parseEdgesResponse("not json at all")).toEqual([]);
  });

  test("returns [] when edges is missing or not an array", () => {
    expect(parseEdgesResponse("{}")).toEqual([]);
    expect(parseEdgesResponse('{"edges":"nope"}')).toEqual([]);
  });
});
