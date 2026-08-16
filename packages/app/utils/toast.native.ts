import type { ReactNode } from 'react';
import { ToastAndroid, Platform, Alert } from "react-native";

type ToastOptions = {
    timeout?: number;
    duration?: number;
    id?: string;
    icon?: ReactNode;
    description?: ReactNode;
    action?: { label: string; onClick: () => void };
};

export const toast = {
    success: (msg: string, _options?: ToastOptions) => {
        if (Platform.OS === 'android') {
            ToastAndroid.show(msg, ToastAndroid.SHORT);
        } else {
            // iOS 没有原生 Toast，这里简单 log 或使用 Alert
            console.log('Toast success:', msg);
        }
        return "";
    },
    error: (msg: string, _options?: ToastOptions) => {
        if (Platform.OS === 'android') {
            ToastAndroid.show(msg, ToastAndroid.LONG);
        } else {
            Alert.alert('Error', msg);
        }
        return "";
    },
    loading: (msg: string, _options?: ToastOptions) => {
        console.log('Toast loading:', msg);
        return "loading-id";
    },
    dismiss: (_id?: string) => {
        // no-op
    },
    // 兼容 react-hot-toast 的其他方法
    custom: () => { },
    promise: async (promise: Promise<any>, msgs: { loading: string; success: string; error: string }) => {
        try {
            await promise;
            toast.success(msgs.success);
        } catch (e) {
            toast.error(msgs.error);
            throw e;
        }
        return promise;
    }
};

export default toast;
