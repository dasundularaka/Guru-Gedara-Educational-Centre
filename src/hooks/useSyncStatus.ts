import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';

export type SyncFieldStatus = 'idle' | 'syncing' | 'saved' | 'error' | 'retrying';

export interface FieldState {
  status: SyncFieldStatus;
  message?: string;
}

export function useSyncStatus() {
  const { executeWriteWithRetry } = useApp();
  const [fieldStates, setFieldStates] = useState<Record<string, FieldState>>({});

  const syncField = useCallback(async <T,>(
    fieldId: string,
    operationLabel: string,
    writeFn: () => Promise<T>,
    verifyFn?: (result: T) => Promise<boolean>
  ): Promise<T> => {
    // 1. Set state to syncing
    setFieldStates(prev => ({
      ...prev,
      [fieldId]: { status: 'syncing', message: 'Syncing details...' }
    }));

    try {
      // 2. Execute via the app-wide robust write-with-retry engine
      const result = await executeWriteWithRetry(operationLabel, writeFn, verifyFn);

      // 3. Update state to saved
      setFieldStates(prev => ({
        ...prev,
        [fieldId]: { status: 'saved', message: 'Saved & verified on Firestore Cloud' }
      }));

      // 4. Reset to idle after a 3-second delay
      setTimeout(() => {
        setFieldStates(prev => {
          const updated = { ...prev };
          if (updated[fieldId]?.status === 'saved') {
            updated[fieldId] = { status: 'idle' };
          }
          return updated;
        });
      }, 3000);

      return result;
    } catch (err: any) {
      // 5. Update state to error
      const errorMessage = err?.message || 'Sync failed';
      setFieldStates(prev => ({
        ...prev,
        [fieldId]: { status: 'error', message: errorMessage }
      }));

      // Reset error after 5 seconds
      setTimeout(() => {
        setFieldStates(prev => {
          const updated = { ...prev };
          if (updated[fieldId]?.status === 'error') {
            updated[fieldId] = { status: 'idle' };
          }
          return updated;
        });
      }, 5000);

      throw err;
    }
  }, [executeWriteWithRetry]);

  const getFieldStatus = useCallback((fieldId: string): SyncFieldStatus => {
    return fieldStates[fieldId]?.status || 'idle';
  }, [fieldStates]);

  const getFieldMessage = useCallback((fieldId: string): string => {
    return fieldStates[fieldId]?.message || '';
  }, [fieldStates]);

  const syncFieldStart = useCallback((fieldId: string, message = 'Syncing details...') => {
    setFieldStates(prev => ({
      ...prev,
      [fieldId]: { status: 'syncing', message }
    }));
  }, []);

  const syncFieldSuccess = useCallback((fieldId: string, message = 'Saved & verified on Firestore Cloud') => {
    setFieldStates(prev => ({
      ...prev,
      [fieldId]: { status: 'saved', message }
    }));

    setTimeout(() => {
      setFieldStates(prev => {
        const updated = { ...prev };
        if (updated[fieldId]?.status === 'saved') {
          updated[fieldId] = { status: 'idle' };
        }
        return updated;
      });
    }, 3000);
  }, []);

  const syncFieldFailure = useCallback((fieldId: string, message = 'Sync failed') => {
    setFieldStates(prev => ({
      ...prev,
      [fieldId]: { status: 'error', message }
    }));

    setTimeout(() => {
      setFieldStates(prev => {
        const updated = { ...prev };
        if (updated[fieldId]?.status === 'error') {
          updated[fieldId] = { status: 'idle' };
        }
        return updated;
      });
    }, 5000);
  }, []);

  const syncFieldRetrying = useCallback((fieldId: string, message = 'Sync delayed - Retrying...') => {
    setFieldStates(prev => ({
      ...prev,
      [fieldId]: { status: 'retrying', message }
    }));
  }, []);

  return {
    syncField,
    getFieldStatus,
    getFieldMessage,
    syncFieldStart,
    syncFieldSuccess,
    syncFieldFailure,
    syncFieldRetrying,
    fieldStates
  };
}
