import { useState, useCallback } from 'react';

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  variant: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: '',
    message: '',
    variant: 'warning',
    onConfirm: () => {},
  });

  const confirm = useCallback(
    (
      title: string,
      message: string,
      variant: 'danger' | 'warning' | 'info' = 'warning'
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          open: true,
          title,
          message,
          variant,
          onConfirm: () => {
            setState((s) => ({ ...s, open: false }));
            resolve(true);
          },
        });
      });
    },
    []
  );

  const cancel = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  return { requestConfirm: confirm, cancel, state };
}
