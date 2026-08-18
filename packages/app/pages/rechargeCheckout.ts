type CheckoutWindow = {
  open?: (url: string, target: string, features: string) => unknown;
  assignLocation?: (url: string) => void;
};

const getBrowserWindow = (): CheckoutWindow => ({
  open: globalThis.window?.open?.bind(globalThis.window),
  assignLocation: (url) => {
    globalThis.window.location.href = url;
  },
});

export const openCheckoutUrl = (
  checkoutUrl: string,
  browserWindow: CheckoutWindow = getBrowserWindow()
) => {
  const opened = browserWindow.open?.(
    checkoutUrl,
    "_blank",
    "noopener,noreferrer"
  );
  if (!opened) browserWindow.assignLocation?.(checkoutUrl);
};
