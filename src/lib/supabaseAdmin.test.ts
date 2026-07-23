import { describe, expect, it } from "vitest";
import { merchantActive, Merchant } from "./supabaseAdmin";

function buildMerchant(subscriptionStatus: Merchant["subscription_status"]): Merchant {
  return {
    id: "merchant-1",
    owner_id: "owner-1",
    slug: "test-merchant",
    name: "Test Merchant",
    logo_url: null,
    theme_id: "marine",
    address: null,
    lat: null,
    lng: null,
    program_type: "visits",
    max_scans_per_day: 1,
    google_class_id: null,
    subscription_status: subscriptionStatus,
  };
}

describe("merchantActive", () => {
  it("is active while trialing", () => {
    expect(merchantActive(buildMerchant("trialing"))).toBe(true);
  });

  it("is active once active", () => {
    expect(merchantActive(buildMerchant("active"))).toBe(true);
  });

  it("blocks past_due merchants", () => {
    expect(merchantActive(buildMerchant("past_due"))).toBe(false);
  });

  it("blocks canceled merchants", () => {
    expect(merchantActive(buildMerchant("canceled"))).toBe(false);
  });
});
