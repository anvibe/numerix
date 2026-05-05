import toast from 'react-hot-toast';

export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      duration: 4000,
    });
  },
  
  error: (message: string) => {
    toast.error(message, {
      duration: 5000,
    });
  },
  
  info: (message: string) => {
    toast(message, {
      duration: 4000,
    });
  },
  
  loading: (message: string) => {
    return toast.loading(message);
  },

  /** Dismiss toast(s). Call with no args to dismiss all, or pass a toast id to dismiss that one. */
  dismiss: (id?: string) => {
    if (id !== undefined) {
      toast.dismiss(id);
    } else {
      toast.dismiss();
    }
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => {
    return toast.promise(promise, messages);
  },
};
