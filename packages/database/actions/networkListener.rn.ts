import { setCachedNetworkState } from './common';

let netInfoListenerInitialized = false;

const isReactNative = (): boolean => {
  return typeof navigator !== 'undefined' && (navigator as any).product === 'ReactNative';
};

export const initNetworkListener = async () => {
  if (!isReactNative() || netInfoListenerInitialized) return;

  try {
    const NetInfo = await import('@react-native-community/netinfo');
    NetInfo.default.addEventListener(state => {
      setCachedNetworkState(state.isConnected ?? true);
    });
    netInfoListenerInitialized = true;
    console.log('[NetInfo] Listener initialized');
  } catch (error) {
    console.warn('[NetInfo] Failed to initialize:', error);
  }
};
