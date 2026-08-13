import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextProps {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextProps>({ socket: null, connected: false });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  // Track org ID in React state so the effect properly re-runs when it changes
  const [activeOrgId, setActiveOrgId] = useState<string | null>(
    () => localStorage.getItem('active_organization_id')
  );

  // Sync activeOrgId when storage changes (e.g. org switch triggers window.location.reload)
  useEffect(() => {
    const handleStorageChange = () => {
      setActiveOrgId(localStorage.getItem('active_organization_id'));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (!activeOrgId) {
      setSocket(null);
      setConnected(false);
      return;
    }

    // Automatically derive socket URL from API URL if VITE_SOCKET_URL is missing
    const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || '';
    const derivedSocketUrl = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
    const SOCKET_URL =
      (import.meta.env.VITE_SOCKET_URL as string) ||
      derivedSocketUrl ||
      'http://localhost:10000';

    console.log('🔌 Attempting Socket connection to:', SOCKET_URL, 'for org:', activeOrgId);

    // Connect to backend socket instance
    const socketInstance = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      auth: {
        organizationId: activeOrgId,
      },
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });

    socketInstance.on('connect', () => {
      setConnected(true);
      console.log('🔌 Real-time Socket.io connected to room:', activeOrgId);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('⚠️ Socket connection error:', err.message);
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
      console.log('🔌 Socket.io disconnected.');
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [activeOrgId]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};
export default SocketContext;

