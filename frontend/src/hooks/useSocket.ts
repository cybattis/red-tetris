import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../store/index.js';
import { selectConnectionStatus } from '../store/slices/connectionSlice.js';

export function useSocket() {
  const dispatch = useAppDispatch();
  const connectionStatus = useAppSelector(selectConnectionStatus);

  // Initialize socket connection on mount
  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      // Initialize socket connection
      dispatch({ type: 'connection/initSocket' });
    }

    // Cleanup on unmount
    return () => {
      dispatch({ type: 'connection/disconnectSocket' });
    };
  }, []); // Only run once on mount

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    isReconnecting: connectionStatus === 'reconnecting',
    hasError: connectionStatus === 'error',
  };
}
