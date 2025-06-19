import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface OfflineState {
  isOnline: boolean;
  pendingActions: OfflineAction[];
  isSyncing: boolean;
  lastSyncAt: number | null;
}

interface UseOfflineSupportOptions {
  maxRetries?: number;
  retryDelay?: number;
  syncInterval?: number;
  enableOptimisticUpdates?: boolean;
}

const OFFLINE_STORAGE_KEY = 'offline_actions';
const SYNC_STORAGE_KEY = 'last_sync';

export const useOfflineSupport = (options: UseOfflineSupportOptions = {}) => {
  const {
    maxRetries = 3,
    retryDelay = 5000,
    syncInterval = 30000,
    enableOptimisticUpdates = true
  } = options;

  const queryClient = useQueryClient();
  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  const [state, setState] = useState<OfflineState>({
    isOnline: navigator.onLine,
    pendingActions: [],
    isSyncing: false,
    lastSyncAt: null
  });

  // Load pending actions from localStorage on mount
  useEffect(() => {
    const savedActions = localStorage.getItem(OFFLINE_STORAGE_KEY);
    const lastSync = localStorage.getItem(SYNC_STORAGE_KEY);
    
    if (savedActions) {
      try {
        const actions = JSON.parse(savedActions);
        setState(prev => ({
          ...prev,
          pendingActions: actions,
          lastSyncAt: lastSync ? parseInt(lastSync) : null
        }));
      } catch (error) {
        console.error('Failed to parse offline actions:', error);
        localStorage.removeItem(OFFLINE_STORAGE_KEY);
      }
    }
  }, []);

  // Save pending actions to localStorage whenever they change
  useEffect(() => {
    if (state.pendingActions.length > 0) {
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(state.pendingActions));
    } else {
      localStorage.removeItem(OFFLINE_STORAGE_KEY);
    }
  }, [state.pendingActions]);

  // Handle online/offline events (syncPendingActions will be defined below)
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      toast.success('Back online! Syncing pending changes...');
      // syncPendingActions will be called in another effect
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
      toast.error('Connection lost. Changes will be saved locally.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const generateActionId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const addPendingAction = useCallback((action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>) => {
    const newAction: OfflineAction = {
      ...action,
      id: generateActionId(),
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries
    };

    setState(prev => ({
      ...prev,
      pendingActions: [...prev.pendingActions, newAction]
    }));

    return newAction.id;
  }, [maxRetries]);

  const removePendingAction = useCallback((actionId: string) => {
    setState(prev => ({
      ...prev,
      pendingActions: prev.pendingActions.filter(action => action.id !== actionId)
    }));
  }, []);

  const updatePendingAction = useCallback((actionId: string, updates: Partial<OfflineAction>) => {
    setState(prev => ({
      ...prev,
      pendingActions: prev.pendingActions.map(action =>
        action.id === actionId ? { ...action, ...updates } : action
      )
    }));
  }, []);

  const executeAction = async (action: OfflineAction): Promise<any> => {
    // This would be replaced with actual API calls
    const { type, entity, data } = action;
    
    // Simulate API call based on action type
    switch (type) {
      case 'create':
        return await fetch(`/api/${entity}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        });

      case 'update':
        return await fetch(`/api/${entity}/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        });

      case 'delete':
        return await fetch(`/api/${entity}/${data.id}`, {
          method: 'DELETE'
        }).then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        });

      default:
        throw new Error(`Unknown action type: ${type}`);
    }
  };

  const updateOptimisticCache = (action: OfflineAction) => {
    const { type, entity, data } = action;
    const queryKey = [entity];

    switch (type) {
      case 'create':
        queryClient.setQueryData(queryKey, (oldData: any[]) => {
          if (Array.isArray(oldData)) {
            return [...oldData, data];
          }
          return oldData;
        });
        break;

      case 'update':
        queryClient.setQueryData(queryKey, (oldData: any[]) => {
          if (Array.isArray(oldData)) {
            return oldData.map(item => item.id === data.id ? { ...item, ...data } : item);
          }
          return oldData;
        });
        break;

      case 'delete':
        queryClient.setQueryData(queryKey, (oldData: any[]) => {
          if (Array.isArray(oldData)) {
            return oldData.filter(item => item.id !== data.id);
          }
          return oldData;
        });
        break;
    }
  };

  const syncPendingActions = useCallback(async () => {
    if (!state.isOnline || state.isSyncing || state.pendingActions.length === 0) {
      return;
    }

    setState(prev => ({ ...prev, isSyncing: true }));

    const actionsToSync = [...state.pendingActions].sort((a, b) => a.timestamp - b.timestamp);
    const successfulActions: string[] = [];
    const failedActions: string[] = [];

    for (const action of actionsToSync) {
      try {
        await executeAction(action);
        successfulActions.push(action.id);
        
        // Update optimistic cache if needed
        if (enableOptimisticUpdates) {
          updateOptimisticCache(action);
        }
      } catch (error) {
        console.error('Failed to sync action:', action, error);
        
        if (action.retryCount < action.maxRetries) {
          updatePendingAction(action.id, {
            retryCount: action.retryCount + 1
          });
        } else {
          failedActions.push(action.id);
          toast.error(`Failed to sync ${action.type} action after ${action.maxRetries} retries`);
        }
      }
    }

    // Remove successful and permanently failed actions
    setState(prev => ({
      ...prev,
      pendingActions: prev.pendingActions.filter(
        action => !successfulActions.includes(action.id) && !failedActions.includes(action.id)
      ),
      isSyncing: false,
      lastSyncAt: Date.now()
    }));

    // Save last sync time
    localStorage.setItem(SYNC_STORAGE_KEY, Date.now().toString());

    if (successfulActions.length > 0) {
      toast.success(`Synced ${successfulActions.length} pending actions`);
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries();
    }

    // Schedule retry for remaining actions
    if (state.pendingActions.some(a => !successfulActions.includes(a.id) && !failedActions.includes(a.id))) {
      retryTimeoutRef.current = setTimeout(() => {
        syncPendingActions();
      }, retryDelay);
    }
  }, [state.isOnline, state.isSyncing, state.pendingActions, enableOptimisticUpdates, queryClient, retryDelay, updatePendingAction]);

  // Auto-sync when online
  useEffect(() => {
    if (state.isOnline && state.pendingActions.length > 0) {
      syncPendingActions();
    }
  }, [state.isOnline, state.pendingActions.length, syncPendingActions]);

  // Periodic sync
  useEffect(() => {
    if (state.isOnline) {
      syncTimeoutRef.current = setInterval(() => {
        if (state.pendingActions.length > 0) {
          syncPendingActions();
        }
      }, syncInterval);

      return () => {
        if (syncTimeoutRef.current) {
          clearInterval(syncTimeoutRef.current);
        }
      };
    }
  }, [state.isOnline, state.pendingActions.length, syncInterval, syncPendingActions]);

  // Optimistic mutation wrapper
  const createOptimisticMutation = useCallback((
    mutationFn: (data: any) => Promise<any>,
    options: {
      entity: string;
      type: 'create' | 'update' | 'delete';
      onSuccess?: (data: any) => void;
      onError?: (error: any) => void;
      rollbackFn?: () => void;
    }
  ) => {
    return async (data: any) => {
      const { entity, type, onSuccess, onError, rollbackFn } = options;

      if (state.isOnline) {
        // Try immediate execution when online
        try {
          const result = await mutationFn(data);
          onSuccess?.(result);
          return result;
        } catch (error) {
          // If online request fails, fallback to offline mode
          console.warn('Online request failed, falling back to offline mode:', error);
        }
      }

      // Offline mode or online fallback
      const actionId = addPendingAction({
        type,
        entity,
        data,
        maxRetries
      });

      // Apply optimistic update
      if (enableOptimisticUpdates) {
        updateOptimisticCache({ type, entity, data } as OfflineAction);
        
        toast.success(
          state.isOnline 
            ? 'Action queued for sync' 
            : 'Saved locally - will sync when online'
        );
      }

      // Return a promise that resolves when the action is eventually synced
      return new Promise((resolve, reject) => {
        const checkSync = () => {
          const action = state.pendingActions.find(a => a.id === actionId);
          if (!action) {
            // Action completed successfully
            resolve(data);
          } else if (action.retryCount >= action.maxRetries) {
            // Action failed permanently
            rollbackFn?.();
            reject(new Error('Action failed after maximum retries'));
          } else {
            // Still pending, check again later
            setTimeout(checkSync, 1000);
          }
        };

        setTimeout(checkSync, 1000);
      });
    };
  }, [state.isOnline, state.pendingActions, addPendingAction, enableOptimisticUpdates, maxRetries]);

  // Manual sync trigger
  const forcSync = useCallback(() => {
    if (state.pendingActions.length === 0) {
      toast('No pending actions to sync');
      return;
    }
    
    syncPendingActions();
  }, [syncPendingActions, state.pendingActions.length]);

  // Clear all pending actions
  const clearPendingActions = useCallback(() => {
    setState(prev => ({ ...prev, pendingActions: [] }));
    localStorage.removeItem(OFFLINE_STORAGE_KEY);
    toast.success('Cleared all pending actions');
  }, []);

  // Get storage usage
  const getStorageInfo = useCallback(() => {
    const actions = localStorage.getItem(OFFLINE_STORAGE_KEY);
    const sizeInBytes = actions ? new Blob([actions]).size : 0;
    const sizeInKB = Math.round(sizeInBytes / 1024 * 100) / 100;

    return {
      pendingActionsCount: state.pendingActions.length,
      storageSize: sizeInKB,
      lastSyncAt: state.lastSyncAt,
      oldestActionAge: state.pendingActions.length > 0 
        ? Date.now() - Math.min(...state.pendingActions.map(a => a.timestamp))
        : 0
    };
  }, [state.pendingActions, state.lastSyncAt]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearInterval(syncTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    isOnline: state.isOnline,
    pendingActions: state.pendingActions,
    isSyncing: state.isSyncing,
    lastSyncAt: state.lastSyncAt,
    
    // Actions
    addPendingAction,
    removePendingAction,
    createOptimisticMutation,
    syncPendingActions,
    forcSync,
    clearPendingActions,
    
    // Info
    getStorageInfo,
    
    // Utils
    canMutate: enableOptimisticUpdates || state.isOnline,
    shouldShowOfflineIndicator: !state.isOnline || state.pendingActions.length > 0
  };
};

export default useOfflineSupport; 