import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { clientIp } from "./rateLimit";

function requestWithHeaders(headers: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost/api/test", { headers });
}

describe("clientIp", () => {
  it("uses the first entry of x-forwarded-for", () => {
    const req = requestWithHeaders({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(clientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip when there is no proxy chain", () => {
    const req = requestWithHeaders({ "x-real-ip": "9.9.9.9" });
    expect(clientIp(req)).toBe("9.9.9.9");
  });

  it("returns unknown when no IP header is present", () => {
    const req = requestWithHeaders({});
    expect(clientIp(req)).toBe("unknown");
  });
});
