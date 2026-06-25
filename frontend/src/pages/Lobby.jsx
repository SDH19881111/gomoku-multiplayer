import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { User, PlusCircle, LogIn, CheckSquare, Square } from 'lucide-react';

const Lobby = ({ roomData, setRoomData, nickname, setNickname, isNicknameSet, setIsNicknameSet }) => {
  const socket = useSocket();
  const [rooms, setRooms] = useState([]);
  const [rule33, setRule33] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [inRoom, setInRoom] = useState(false); 
  const [myRoomCode, setMyRoomCode] = useState('');

  useEffect(() => {
    if (!socket) return;

    socket.emit('get_rooms', (data) => setRooms(data));

    socket.on('room_list_update', (data) => {
      setRooms(data);
    });

    socket.on('room_full', (data) => {
        setRoomData(prev => ({ ...prev, ...data, status: 'full' }));
    });

    return () => {
      socket.off('room_list_update');
      socket.off('room_full');
    };
  }, [socket, setRoomData]);

  const handleSetNickname = (e) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    socket.emit('set_nickname', nickname, (res) => {
      if (res.success) {
        setIsNicknameSet(true);
      } else {
        alert(res.message);
      }
    });
  };

  const handleCreateRoom = () => {
    socket.emit('create_room', { rule33 }, (res) => {
      if (res.success) {
        setMyRoomCode(res.roomId);
        setInRoom(true);
        setRoomData({ roomId: res.roomId, hostNickname: nickname, rule33, status: 'waiting', black: nickname, white: null, myRole: 'black' });
      } else {
        alert('방 생성 실패');
      }
    });
  };

  const handleJoinRoom = (roomId) => {
    if (!roomId.trim()) return;
    socket.emit('join_room', roomId, (res) => {
      if (res.success) {
        setMyRoomCode(roomId);
        setInRoom(true);
        setRoomData({ roomId, status: 'full', myRole: 'white' }); 
      } else {
        alert(res.message);
      }
    });
  };

  const handleStartGame = () => {
      socket.emit('start_game');
  };

  if (!isNicknameSet) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-6 text-primary">✨ 반짝클래스 오목</h1>
        <form onSubmit={handleSetNickname} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">닉네임</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm py-2 px-3 border focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="사용할 닉네임을 입력하세요"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={10}
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            입장하기
          </button>
        </form>
      </div>
    );
  }

  if (inRoom) {
      const isFull = roomData?.status === 'full';
      const isHost = roomData?.myRole === 'black';

      return (
          <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
              <h2 className="text-2xl font-bold mb-4">{isHost ? "방 대기중..." : "방 입장 완료!"}</h2>
              <div className="text-6xl font-mono tracking-wider font-bold text-blue-600 mb-6">{myRoomCode}</div>
              
              {isHost ? (
                  <>
                      <p className="text-gray-500 mb-8">친구에게 위 방 코드를 알려주세요!</p>
                      {isFull && <p className="text-green-600 font-bold mb-4">참가자({roomData?.white})가 입장했습니다!</p>}
                      <button
                          onClick={handleStartGame}
                          disabled={!isFull}
                          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                      >
                          게임 시작
                      </button>
                      {!isFull && <p className="text-xs text-gray-400 mt-2">상대방이 접속하면 버튼이 활성화됩니다.</p>}
                  </>
              ) : (
                  <>
                      <p className="text-green-600 font-bold mb-8">방장이 게임을 시작하기를 기다리고 있습니다...</p>
                      <div className="flex justify-center items-center space-x-2 text-gray-500">
                          <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                  </>
              )}
          </div>
      )
  }

  return (
    <div className="w-full max-w-4xl p-6">
      <h1 className="text-4xl font-bold mb-8 text-primary text-center">✨ 반짝클래스 오목 로비</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-blue-500">
          <h2 className="text-2xl font-bold mb-4 flex items-center"><PlusCircle className="mr-2"/> 방 만들기</h2>
          
          <div className="mb-6 flex items-center cursor-pointer" onClick={() => setRule33(!rule33)}>
            {rule33 ? <CheckSquare className="text-blue-500 mr-2" /> : <Square className="text-gray-400 mr-2" />}
            <span className="font-medium">3-3 금지 룰 적용 (흑돌)</span>
          </div>

          <button
            onClick={handleCreateRoom}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
          >
            새 게임 방 개설
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-green-500">
          <h2 className="text-2xl font-bold mb-4 flex items-center"><LogIn className="mr-2"/> 코드 접속</h2>
          
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="6자리 방 코드"
              className="flex-1 border rounded-lg px-4 py-2 text-center text-xl tracking-widest font-mono uppercase outline-none focus:ring-2 focus:ring-green-500"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              maxLength={6}
            />
            <button
              onClick={() => handleJoinRoom(joinCode)}
              className="px-6 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition"
            >
              입장
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold mb-4">현재 대기 중인 방</h2>
        {rooms.length === 0 ? (
          <p className="text-gray-500 text-center py-4">참가 가능한 방이 없습니다. 새로 만들어보세요!</p>
        ) : (
          <ul className="space-y-3">
            {rooms.map(room => (
              <li key={room.roomId} className="flex justify-between items-center p-4 border rounded-lg hover:bg-slate-50 transition">
                <div>
                  <span className="font-bold text-lg">{room.hostNickname}</span>님의 방
                  <span className="ml-3 text-xs bg-gray-200 px-2 py-1 rounded-full">{room.rule33 ? '3-3 금지 ON' : '3-3 금지 OFF'}</span>
                </div>
                <button
                  onClick={() => handleJoinRoom(room.roomId)}
                  className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 text-sm"
                >
                  참가하기
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Lobby;
