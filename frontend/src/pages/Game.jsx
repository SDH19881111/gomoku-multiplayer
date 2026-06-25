import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { Home, Undo2, Flag } from 'lucide-react';
import clsx from 'clsx';

const Game = ({ roomData, setGameState, setRoomData }) => {
  const socket = useSocket();
  const [board, setBoard] = useState(roomData.board || Array(15).fill(Array(15).fill(0)));
  const [currentTurn, setCurrentTurn] = useState(roomData.currentTurn || 'black');
  const [undoCount, setUndoCount] = useState(roomData.undoCount || { black: 3, white: 3 });
  const [modal, setModal] = useState(null); 

  const myRole = roomData.myRole || 'black'; 
  const isMyTurn = currentTurn === myRole;

  useEffect(() => {
    if (!socket) return;

    socket.on('board_update', (data) => {
      setBoard(data.board);
      setCurrentTurn(data.currentTurn);
    });

    socket.on('game_started', (data) => {
      setBoard(data.board);
      setCurrentTurn(data.currentTurn);
      setUndoCount(data.undoCount);
      setModal(null);
    });

    socket.on('invalid_move', (data) => {
      alert(data.message);
    });

    socket.on('game_over', (data) => {
      setBoard(data.board || board);
      const isWinner = data.winner === myRole;
      setModal({
        type: 'game_over',
        title: isWinner ? '🎉 승리했습니다!' : '💀 패배했습니다...',
        message: '게임을 다시 시작하시겠습니까?',
        onConfirm: () => {
          socket.emit('request_action', 'rematch');
          setModal({
            type: 'waiting',
            title: '재도전 요청 완료',
            message: '상대방의 응답을 기다리는 중입니다...',
            onCancel: () => {
              socket.emit('request_action', 'resign');
              setGameState('lobby');
              setRoomData(null);
            }
          });
        },
        onCancel: () => {
          socket.emit('request_action', 'resign');
          setGameState('lobby');
          setRoomData(null);
        }
      });
    });

    socket.on('action_requested', (data) => {
      let title = '';
      let message = '';
      if (data.type === 'undo') {
        title = '무르기 요청';
        message = '상대방이 무르기를 요청했습니다. 수락하시겠습니까?';
      } else if (data.type === 'rematch') {
        title = '재도전 요청';
        message = '상대방이 재도전을 요청했습니다. 수락하시겠습니까?';
      }

      setModal({
        type: 'request',
        title,
        message,
        onConfirm: () => {
          socket.emit('respond_action', { accept: true });
          setModal(null);
        },
        onCancel: () => {
          socket.emit('respond_action', { accept: false });
          setModal(null);
        }
      });
    });

    socket.on('action_accepted', (data) => {
      if (data.type === 'undo') {
        setBoard(data.board);
        setCurrentTurn(data.currentTurn);
        setUndoCount(data.undoCount);
        alert('무르기가 수락되었습니다.');
      }
    });

    socket.on('action_rejected', (data) => {
      alert('상대방이 요청을 거절했습니다.');
      if (data.type === 'rematch') {
          setGameState('lobby');
          setRoomData(null);
      } else {
          setModal(null);
      }
    });

    return () => {
      socket.off('board_update');
      socket.off('invalid_move');
      socket.off('game_over');
      socket.off('action_requested');
      socket.off('action_accepted');
      socket.off('action_rejected');
    };
  }, [socket, board, myRole, setGameState, setRoomData]);

  const handleCellClick = (r, c) => {
    if (!isMyTurn || board[r][c] !== 0) return;
    socket.emit('place_stone', { row: r, col: c });
  };

  const handleHomeClick = () => {
    if (confirm('정말 홈으로 돌아가시겠습니까? 진행 중인 게임은 기권 처리됩니다.')) {
      setGameState('lobby');
      setRoomData(null);
      socket.emit('request_action', 'resign');
    }
  };

  const handleUndo = () => {
    if (undoCount[myRole] > 0) {
      socket.emit('request_action', 'undo');
    }
  };

  const handleResign = () => {
    socket.emit('request_action', 'resign');
  };

  const renderBoard = () => {
    const cells = [];
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        const isStar = (r === 3 || r === 11 || r === 7) && (c === 3 || c === 11 || c === 7);
        const isTop = r === 0;
        const isBottom = r === 14;
        const isLeft = c === 0;
        const isRight = c === 14;
        
        cells.push(
          <div 
            key={`${r}-${c}`} 
            className={clsx(
              "cell", 
              isTop && "top-edge", 
              isBottom && "bottom-edge", 
              isLeft && "left-edge", 
              isRight && "right-edge"
            )}
            onClick={() => handleCellClick(r, c)}
          >
            {isStar && <div className="star-point"></div>}
            {board[r] && board[r][c] === 1 && <div className="stone black"></div>}
            {board[r] && board[r][c] === 2 && <div className="stone white"></div>}
          </div>
        );
      }
    }
    return cells;
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#f8fafc]">
      {/* Top Bar */}
      <div className="bg-primary text-white flex justify-between items-center px-4 py-2">
        <div className="flex items-center space-x-4">
          <span className="text-yellow-400 font-bold text-lg">✨ 반짝클래스 오목</span>
          <button onClick={handleHomeClick} className="flex items-center bg-slate-600 px-3 py-1 rounded text-sm hover:bg-slate-500 transition">
            <Home className="w-4 h-4 mr-1" /> 반짝클래스 홈
          </button>
        </div>
        <div className="text-sm font-medium">
          3-3 금지: {roomData.rule33 ? 'ON' : 'OFF'}
        </div>
      </div>

      {/* Turn Indicator */}
      <div className="bg-slate-700 text-center py-2 flex justify-center items-center">
        {currentTurn === 'black' ? (
            <div className="w-4 h-4 rounded-full bg-black border border-gray-500 mr-2 shadow-sm"></div>
        ) : (
            <div className="w-4 h-4 rounded-full bg-white border border-gray-400 mr-2 shadow-sm"></div>
        )}
        <span className={clsx("font-bold", isMyTurn ? "text-yellow-400" : "text-gray-300")}>
          {isMyTurn ? "내 턴입니다! 돌을 놓으세요." : "상대방의 턴입니다. 기다려주세요."}
        </span>
      </div>

      {/* Board Area */}
      <div className="flex-1 flex justify-center items-center bg-board p-4 overflow-hidden relative shadow-inner">
        <div className="w-full max-w-[600px] aspect-square bg-[#dca850] shadow-2xl p-2 border-2 border-[#b58535] relative">
           <div className="board-grid">
               {renderBoard()}
           </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-bottomBar p-4 flex justify-center space-x-4">
        <button 
          onClick={handleUndo}
          disabled={undoCount[myRole] === 0 || !isMyTurn}
          className="flex items-center bg-blueBtn text-white px-6 py-3 rounded-full font-bold shadow-md hover:bg-blue-600 disabled:bg-blue-300 transition"
        >
          <Undo2 className="w-5 h-5 mr-2" />
          무르기 ({undoCount[myRole] || 0}/3)
        </button>
        <button 
          onClick={handleResign}
          className="flex items-center bg-redBtn text-white px-6 py-3 rounded-full font-bold shadow-md hover:bg-red-600 transition"
        >
          <Flag className="w-5 h-5 mr-2" />
          기권/재시작
        </button>
      </div>

      {/* Modals */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full text-center">
            <h2 className="text-2xl font-bold mb-4">{modal.title}</h2>
            <p className="text-gray-600 mb-8">{modal.message}</p>
            <div className="flex justify-center space-x-4">
              {modal.onCancel && (
                <button 
                  onClick={modal.onCancel}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded font-bold hover:bg-gray-400 transition"
                >
                  {modal.type === 'waiting' ? '나가기' : '거절/나가기'}
                </button>
              )}
              {modal.onConfirm && (
                <button 
                  onClick={modal.onConfirm}
                  className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition"
                >
                  수락/재도전
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;
