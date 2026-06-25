import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { Home, Undo2, Flag } from 'lucide-react';
import clsx from 'clsx';

const EMPTY_BOARD = Array(15).fill(null).map(() => Array(15).fill(0));

const Game = ({ roomData, setGameState, setRoomData }) => {
  const socket = useSocket();
  const [board, setBoard] = useState(roomData.board || EMPTY_BOARD);
  const [currentTurn, setCurrentTurn] = useState(roomData.currentTurn || 'black');
  const [undoCount, setUndoCount] = useState(roomData.undoCount || { black: 3, white: 3 });
  const [modal, setModal] = useState(null); 
  const [gameStatus, setGameStatus] = useState('playing'); // 'playing', 'finished'

  const myRole = roomData.myRole || 'black'; 
  const isMyTurn = currentTurn === myRole;

  // 보드를 완전 리셋하는 함수
  const resetGameState = useCallback((data) => {
    const newBoard = data.board || Array(15).fill(null).map(() => Array(15).fill(0));
    setBoard(newBoard);
    setCurrentTurn(data.currentTurn || 'black');
    setUndoCount(data.undoCount || { black: 3, white: 3 });
    setModal(null);
    setGameStatus('playing');
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleBoardUpdate = (data) => {
      setBoard(data.board);
      setCurrentTurn(data.currentTurn);
    };

    const handleGameStarted = (data) => {
      // 최초 게임 시작 (App.jsx에서 game 화면으로 전환 후 호출될 수 있음)
      resetGameState(data);
    };

    const handleGameRestarted = (data) => {
      // 기권 수락 또는 재시작 수락 → 보드 완전 리셋
      const reasonMsg = data.reason === 'resign' ? '기권이 수락되었습니다.' : '재도전이 수락되었습니다.';
      resetGameState(data);
      // 잠시 후 알림 (state 업데이트 후)
      setTimeout(() => {
        alert(`${reasonMsg} 새 게임을 시작합니다!`);
      }, 100);
    };

    const handleInvalidMove = (data) => {
      alert(data.message);
    };

    const handleGameOver = (data) => {
      if (data.board) {
        setBoard(data.board);
      }
      setGameStatus('finished');
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
              setGameState('lobby');
              setRoomData(null);
            }
          });
        },
        onCancel: () => {
          setGameState('lobby');
          setRoomData(null);
        }
      });
    };

    const handleActionRequested = (data) => {
      let title = '';
      let message = '';
      if (data.type === 'undo') {
        title = '무르기 요청';
        message = '상대방이 무르기를 요청했습니다. 수락하시겠습니까?';
      } else if (data.type === 'rematch') {
        title = '재도전 요청';
        message = '상대방이 재도전을 요청했습니다. 수락하시겠습니까?';
      } else if (data.type === 'resign') {
        title = '기권 요청';
        message = '상대방이 기권을 요청했습니다. 수락하시겠습니까?';
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
    };

    const handleActionAccepted = (data) => {
      if (data.type === 'undo') {
        setBoard(data.board);
        setCurrentTurn(data.currentTurn);
        setUndoCount(data.undoCount);
        setModal(null);
        alert('무르기가 수락되었습니다.');
      }
    };

    const handleActionRejected = (data) => {
      if (data.type === 'rematch') {
        alert('상대방이 재도전을 거절했습니다.');
        setGameState('lobby');
        setRoomData(null);
      } else if (data.type === 'resign') {
        alert('상대방이 기권 요청을 거절했습니다. 게임을 계속합니다.');
        setModal(null);
      } else {
        alert('상대방이 요청을 거절했습니다.');
        setModal(null);
      }
    };

    socket.on('board_update', handleBoardUpdate);
    socket.on('game_started', handleGameStarted);
    socket.on('game_restarted', handleGameRestarted);
    socket.on('invalid_move', handleInvalidMove);
    socket.on('game_over', handleGameOver);
    socket.on('action_requested', handleActionRequested);
    socket.on('action_accepted', handleActionAccepted);
    socket.on('action_rejected', handleActionRejected);

    return () => {
      socket.off('board_update', handleBoardUpdate);
      socket.off('game_started', handleGameStarted);
      socket.off('game_restarted', handleGameRestarted);
      socket.off('invalid_move', handleInvalidMove);
      socket.off('game_over', handleGameOver);
      socket.off('action_requested', handleActionRequested);
      socket.off('action_accepted', handleActionAccepted);
      socket.off('action_rejected', handleActionRejected);
    };
    // 의존성에서 board를 제거하여 클로저 문제 방지
    // myRole은 roomData에서 한 번만 설정되므로 안전
  }, [socket, myRole, setGameState, setRoomData, resetGameState]);

  const handleCellClick = (r, c) => {
    if (!isMyTurn || board[r][c] !== 0 || gameStatus !== 'playing') return;
    socket.emit('place_stone', { row: r, col: c });
  };

  const handleHomeClick = () => {
    if (confirm('정말 홈으로 돌아가시겠습니까? 진행 중인 게임은 포기됩니다.')) {
      setGameState('lobby');
      setRoomData(null);
    }
  };

  const handleUndo = () => {
    if (undoCount[myRole] > 0) {
      socket.emit('request_action', 'undo');
      setModal({
        type: 'waiting',
        title: '무르기 요청 중',
        message: '상대방의 응답을 기다리는 중입니다...'
      });
    }
  };

  const handleResign = () => {
    if (gameStatus !== 'playing') return;
    
    setModal({
      type: 'confirm_resign',
      title: '기권 확인',
      message: '정말 기권하시겠습니까? 상대방이 수락하면 새 게임이 시작됩니다.',
      onConfirm: () => {
        socket.emit('request_action', 'resign');
        setModal({
          type: 'waiting',
          title: '기권 요청 중',
          message: '상대방의 응답을 기다리는 중입니다...',
          onCancel: () => {
            setModal(null);
          }
        });
      },
      onCancel: () => {
        setModal(null);
      }
    });
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
          {gameStatus === 'finished' ? "게임이 종료되었습니다." :
           isMyTurn ? "내 턴입니다! 돌을 놓으세요." : "상대방의 턴입니다. 기다려주세요."}
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
          disabled={undoCount[myRole] === 0 || !isMyTurn || gameStatus !== 'playing'}
          className="flex items-center bg-blueBtn text-white px-6 py-3 rounded-full font-bold shadow-md hover:bg-blue-600 disabled:bg-blue-300 transition"
        >
          <Undo2 className="w-5 h-5 mr-2" />
          무르기 ({undoCount[myRole] || 0}/3)
        </button>
        <button 
          onClick={handleResign}
          disabled={gameStatus !== 'playing'}
          className="flex items-center bg-redBtn text-white px-6 py-3 rounded-full font-bold shadow-md hover:bg-red-600 disabled:bg-red-300 transition"
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
                  {modal.type === 'waiting' ? '나가기' : 
                   modal.type === 'confirm_resign' ? '취소' :
                   modal.type === 'game_over' ? '나가기' : '거절'}
                </button>
              )}
              {modal.onConfirm && (
                <button 
                  onClick={modal.onConfirm}
                  className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition"
                >
                  {modal.type === 'confirm_resign' ? '기권하기' :
                   modal.type === 'game_over' ? '재도전' :
                   modal.type === 'request' ? '수락' : '확인'}
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
