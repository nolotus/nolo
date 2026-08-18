type ImeKeyboardEventLike = {
  keyCode?: number;
  which?: number;
  nativeEvent?: {
    isComposing?: boolean;
    keyCode?: number;
    which?: number;
  };
};

const IME_FALLBACK_KEYCODE = 229;
const COMPOSITION_END_GRACE_MS = 48;

export const shouldDeferEnterForIme = ({
  event,
  isComposing,
  lastCompositionEndAt,
  now = Date.now(),
}: {
  event: ImeKeyboardEventLike;
  isComposing: boolean;
  lastCompositionEndAt: number;
  now?: number;
}) => {
  const nativeEvent = event.nativeEvent;
  const keyCode =
    nativeEvent?.keyCode ??
    nativeEvent?.which ??
    event.keyCode ??
    event.which ??
    0;

  if (isComposing || nativeEvent?.isComposing) {
    return true;
  }

  if (keyCode === IME_FALLBACK_KEYCODE) {
    return true;
  }

  return now - lastCompositionEndAt < COMPOSITION_END_GRACE_MS;
};

