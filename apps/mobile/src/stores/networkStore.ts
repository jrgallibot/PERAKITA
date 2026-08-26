import { create } from 'zustand';

export type NetworkStatus = 'online' | 'offline';
export type SyncDisplayStatus = 'offline' | 'syncing' | 'synced' | 'pending';

interface NetworkState {
  isConnected: boolean;
  syncStatus: SyncDisplayStatus;
  pendingCount: number;
  setConnected: (connected: boolean) => void;
  setSyncStatus: (status: SyncDisplayStatus) => void;
  setPendingCount: (count: number) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isConnected: false,
  syncStatus: 'offline',
  pendingCount: 0,
  setConnected: (connected) =>
    set((state) => ({
      isConnected: connected,
      syncStatus: connected
        ? state.pendingCount > 0
          ? 'pending'
          : state.syncStatus === 'offline'
            ? 'synced'
            : state.syncStatus
        : 'offline',
    })),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
}));
