import { describe, expect, test } from "bun:test";
import {
  PKCE_VERIFIER_LENGTH,
  computePkceChallenge,
  generatePkcePair,
  generatePkceVerifier,
} from "./pkce";

describe("PKCE utilities", () => {
  test("generatePkceVerifier produces a base64url string of requested length", () => {
    const verifier = generatePkceVerifier();
    expect(verifier.length).toBe(PKCE_VERIFIER_LENGTH);
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  test("generatePkceVerifier enforces RFC 7636 length bounds", () => {
    expect(() => generatePkceVerifier(42)).toThrow();
    expect(() => generatePkceVerifier(129)).toThrow();
  });

  test("computePkceChallenge is deterministic and uses S256", () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = computePkceChallenge(verifier);
    expect(challenge).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
  test("generatePkcePair returns a consistent verifier/challenge pair", () => {
    const pair = generatePkcePair();
    expect(pair.method).toBe("S256");
    expect(computePkceChallenge(pair.verifier)).toBe(pair.challenge);
  });
});
