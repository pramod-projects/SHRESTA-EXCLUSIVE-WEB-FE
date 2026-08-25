import { afterEach, describe, expect, it } from "vitest";
import { ensureRazorpayCheckoutScriptLoaded } from "./razorpay-sdk";

type RazorpayTestWindow = { Razorpay?: unknown };

afterEach(() => {
  delete (window as unknown as RazorpayTestWindow).Razorpay;
  document.querySelectorAll('script[data-shresta-razorpay="1"]').forEach((script) => script.remove());
});

describe("Razorpay SDK loader", () => {
  it("retries with a fresh script after a cold-load failure", async () => {
    const firstLoad = ensureRazorpayCheckoutScriptLoaded();
    const firstScript = document.querySelector<HTMLScriptElement>('script[data-shresta-razorpay="1"]');
    expect(firstScript).not.toBeNull();
    firstScript?.dispatchEvent(new Event("error"));
    await expect(firstLoad).resolves.toBe(false);

    const secondLoad = ensureRazorpayCheckoutScriptLoaded();
    const secondScript = document.querySelector<HTMLScriptElement>('script[data-shresta-razorpay="1"]');
    expect(secondScript).not.toBeNull();
    expect(secondScript).not.toBe(firstScript);
    (window as unknown as RazorpayTestWindow).Razorpay = class Razorpay {};
    secondScript?.dispatchEvent(new Event("load"));

    await expect(secondLoad).resolves.toBe(true);
  });

  it("does not add another script when the SDK is already available", async () => {
    (window as unknown as RazorpayTestWindow).Razorpay = class Razorpay {};

    await expect(ensureRazorpayCheckoutScriptLoaded()).resolves.toBe(true);
    expect(document.querySelector('script[data-shresta-razorpay="1"]')).toBeNull();
  });
});
