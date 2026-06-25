import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

// 배포 시 환경 변수로 URL 설정 가능
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://gomoku-multiplayer-sin.onrender.com';

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};
