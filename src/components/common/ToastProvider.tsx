import { Toaster } from 'react-hot-toast';

export const ToastProvider = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'var(--color-bg-secondary)',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--color-border)',
        },
        success: {
          iconTheme: {
            primary: 'rgb(var(--color-success))',
            secondary: 'white',
          },
        },
        error: {
          iconTheme: {
            primary: 'rgb(var(--color-error))',
            secondary: 'white',
          },
        },
      }}
    />
  );
};
