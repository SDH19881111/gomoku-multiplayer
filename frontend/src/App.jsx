import React, { useState, useEffect } from 'react';
import { useSocket } from './context/SocketContext';
import Lobby from './pages/Lobby';
import Game from './pages/Game';

function App() {
  const socket = useSocket();
  const [gameState, setGameState] = useState('lobby'); // 'lobby', 'game'
  const [roomData, setRoomData] = useState(null);

  useEffect(() => {
    if (!socket) return;

    // 최초 게임 시작 시에만 lobby → game 전환
    // (게임 중 재시작은 Game.jsx의 game_restarted 핸들러에서 처리)
    socket.on('game_started', (data) => {
      setRoomData(prev => ({ ...prev, ...data }));
      setGameState('game');
    });

    socket.on('opponent_disconnected', () => {
      alert('상대방과의 연결이 끊어졌습니다. 로비로 돌아갑니다.');
      setGameState('lobby');
      setRoomData(null);
    });

    return () => {
      socket.off('game_started');
      socket.off('opponent_disconnected');
    };
  }, [socket]);

  if (!socket) return <div className="flex items-center justify-center h-screen font-bold text-2xl text-slate-500">Loading Server Connection...</div>;

  return (
    <div className="w-full h-screen bg-slate-100 flex items-center justify-center overflow-hidden font-sans">
      {gameState === 'lobby' && <Lobby roomData={roomData} setRoomData={setRoomData} />}
      {gameState === 'game' && <Game roomData={roomData} setGameState={setGameState} setRoomData={setRoomData} />}
    </div>
  );
}

export default App;
