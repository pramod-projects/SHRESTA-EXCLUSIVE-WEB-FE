let razorpayScriptLoadPromise: Promise<boolean> | null = null;

type RazorpayWindow = Window & { Razorpay?: unknown };

export function ensureRazorpayCheckoutScriptLoaded(): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  const razorpayWindow = window as RazorpayWindow;
  if (razorpayWindow.Razorpay) {
    return Promise.resolve(true);
  }

  if (razorpayScriptLoadPromise) {
    return razorpayScriptLoadPromise;
  }

  razorpayScriptLoadPromise = new Promise((resolve) => {
    const finish = (loaded: boolean) => {
      if (!loaded) {
        razorpayScriptLoadPromise = null;
      }
      resolve(loaded);
    };
    document.querySelector<HTMLScriptElement>('script[data-shresta-razorpay="1"]')?.remove();

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.shrestaRazorpay = "1";
    script.onload = () => finish(Boolean(razorpayWindow.Razorpay));
    script.onerror = () => {
      script.remove();
      finish(false);
    };
    document.head.appendChild(script);
  });

  return razorpayScriptLoadPromise;
}
