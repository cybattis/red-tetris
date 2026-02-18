/**
 * Custom hook for managing socket connection
 * Handles connection initialization and cleanup
 */

import { useEffect } from 'react';
import { useAppSelector } from '../store/index.js';
// import { useAppDispatch } from '../store/index.js'; // TODO: Uncomment when backend is ready
import { selectConnectionStatus } from '../store/slices/connectionSlice.js';

export function useSocket() {
  // const dispatch = useAppDispatch(); // TODO: Uncomment when backend is ready
  const connectionStatus = useAppSelector(selectConnectionStatus);

  // Initialize socket connection on mount
  useEffect(() => {
    // TODO: Enable when backend is ready
    // For now, we'll skip socket connection to avoid CORS errors
    
    // if (connectionStatus === 'disconnected') {
    //   // Initialize socket connection
    //   dispatch({ type: 'connection/initSocket' });
    // }

    // // Cleanup on unmount
    // return () => {
    //   dispatch({ type: 'connection/disconnectSocket' });
    // };
  }, []); // Only run once on mount

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    isReconnecting: connectionStatus === 'reconnecting',
    hasError: connectionStatus === 'error',
  };
}
