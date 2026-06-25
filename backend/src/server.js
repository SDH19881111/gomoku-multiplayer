import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { rooms, users } from './state.js';
import { generateRoomCode, createEmptyBoard, checkWin, check33 } from './utils.js';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 4000;

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // 1. Set Nickname (로비 진입 시)
  socket.on('set_nickname', (nickname, callback) => {
    const isDuplicate = Object.values(users).some(u => u.nickname === nickname);
    if (isDuplicate) {
      callback({ success: false, message: '동일한 닉네임이 이미 접속 중입니다.' });
    } else {
      users[socket.id] = { nickname, currentRoom: null };
      callback({ success: true });
    }
  });

  // 2. Fetch Room List
  socket.on('get_rooms', (callback) => {
    const availableRooms = Object.values(rooms).filter(r => r.status === 'waiting').map(r => ({
      roomId: r.roomId,
      hostNickname: r.hostNickname,
      rule33: r.rule33
    }));
    callback(availableRooms);
  });

  // 3. Create Room
  socket.on('create_room', ({ rule33 }, callback) => {
    if (!users[socket.id]) return;
    
    const roomId = generateRoomCode();
    rooms[roomId] = {
      roomId,
      hostNickname: users[socket.id].nickname,
      rule33,
      status: 'waiting',
      players: {
        black: socket.id,
        white: null
      },
      board: createEmptyBoard(),
      currentTurn: 'black',
      history: [],
      undoCount: { black: 3, white: 3 },
      pendingRequest: null
    };

    users[socket.id].currentRoom = roomId;
    socket.join(roomId);

    io.emit('room_list_update', Object.values(rooms).filter(r => r.status === 'waiting'));
    
    callback({ success: true, roomId });
  });

  // 4. Join Room
  socket.on('join_room', (roomId, callback) => {
    if (!users[socket.id]) return;
    const room = rooms[roomId];

    if (!room) {
      return callback({ success: false, message: '방을 찾을 수 없습니다.' });
    }
    if (room.status !== 'waiting') {
      return callback({ success: false, message: '이미 게임이 시작되었거나 가득 찬 방입니다.' });
    }
    
    room.players.white = socket.id;
    room.status = 'full';
    users[socket.id].currentRoom = roomId;
    socket.join(roomId);

    io.to(roomId).emit('room_full', { 
        black: room.hostNickname, 
        white: users[socket.id].nickname,
        rule33: room.rule33
    });
    
    io.emit('room_list_update', Object.values(rooms).filter(r => r.status === 'waiting'));
    callback({ success: true, roomId });
  });

  // 5. Start Game
  socket.on('start_game', () => {
    const roomId = users[socket.id]?.currentRoom;
    const room = rooms[roomId];
    if (room && room.players.black === socket.id && room.status === 'full') {
      room.status = 'playing';
      room.board = createEmptyBoard();
      room.currentTurn = 'black';
      room.history = [];
      room.undoCount = { black: 3, white: 3 };
      
      io.to(roomId).emit('game_started', {
        board: room.board,
        currentTurn: room.currentTurn,
        undoCount: room.undoCount
      });
    }
  });

  // 6. Place Stone
  socket.on('place_stone', ({ row, col }) => {
    const roomId = users[socket.id]?.currentRoom;
    const room = rooms[roomId];
    if (!room || room.status !== 'playing') return;

    const isBlack = room.players.black === socket.id;
    const isWhite = room.players.white === socket.id;
    
    if ((isBlack && room.currentTurn !== 'black') || (isWhite && room.currentTurn !== 'white')) {
      return; 
    }

    if (room.board[row][col] !== 0) return; 

    const color = isBlack ? 1 : 2;

    // 3-3 검사
    if (room.rule33 && isBlack) {
      if (check33(room.board, row, col, color)) {
        socket.emit('invalid_move', { message: '3-3 금수 자리입니다.' });
        return;
      }
    }

    room.board[row][col] = color;
    room.history.push({ row, col, color });
    
    // 승리 조건 검사
    if (checkWin(room.board, row, col, color)) {
      room.status = 'finished';
      io.to(roomId).emit('game_over', {
        winner: isBlack ? 'black' : 'white',
        board: room.board
      });
      return;
    }

    room.currentTurn = isBlack ? 'white' : 'black';
    
    io.to(roomId).emit('board_update', {
      board: room.board,
      currentTurn: room.currentTurn
    });
  });

  // 7. 제어 버튼 요청 (무르기, 기권, 재시작)
  socket.on('request_action', (actionType) => {
      const roomId = users[socket.id]?.currentRoom;
      const room = rooms[roomId];
      if (!room) return;

      const role = room.players.black === socket.id ? 'black' : 'white';
      const oppRole = role === 'black' ? 'white' : 'black';
      const oppSocket = room.players[oppRole];

      if (actionType === 'undo') {
          if (room.undoCount[role] <= 0 || room.history.length === 0) return;
          room.pendingRequest = `undo_${role}`;
          io.to(oppSocket).emit('action_requested', { type: 'undo', requester: role });
      } else if (actionType === 'resign') {
           room.pendingRequest = `resign_${role}`;
           io.to(oppSocket).emit('action_requested', { type: 'resign', requester: role });
      } else if (actionType === 'rematch') {
          room.pendingRequest = `rematch_${role}`;
          io.to(oppSocket).emit('action_requested', { type: 'rematch', requester: role });
      }
  });

  // 8. 제어 버튼 요청 응답
  socket.on('respond_action', ({ accept }) => {
      const roomId = users[socket.id]?.currentRoom;
      const room = rooms[roomId];
      if (!room || !room.pendingRequest) return;

      const role = room.players.black === socket.id ? 'black' : 'white';
      const [type, requester] = room.pendingRequest.split('_');
      
      if (requester === role) return;

      if (accept) {
          if (type === 'undo') {
              room.undoCount[requester]--;
              const lastMove = room.history.pop();
              if (lastMove) {
                  room.board[lastMove.row][lastMove.col] = 0;
                  room.currentTurn = lastMove.color === 1 ? 'black' : 'white';
              }
              io.to(roomId).emit('action_accepted', { type: 'undo', board: room.board, currentTurn: room.currentTurn, undoCount: room.undoCount });
          } else if (type === 'resign') {
              room.status = 'finished';
              io.to(roomId).emit('game_over', { winner: role });
          } else if (type === 'rematch') {
              room.status = 'playing';
              room.board = createEmptyBoard();
              room.currentTurn = 'black';
              room.history = [];
              room.undoCount = { black: 3, white: 3 };
              io.to(roomId).emit('game_started', {
                  board: room.board,
                  currentTurn: room.currentTurn,
                  undoCount: room.undoCount
              });
          }
      } else {
           io.to(room.players[requester]).emit('action_rejected', { type });
      }
      room.pendingRequest = null;
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    const user = users[socket.id];
    if (user && user.currentRoom) {
        const roomId = user.currentRoom;
        const room = rooms[roomId];
        if (room) {
            io.to(roomId).emit('opponent_disconnected');
            delete rooms[roomId]; 
            io.emit('room_list_update', Object.values(rooms).filter(r => r.status === 'waiting'));
        }
    }
    delete users[socket.id];
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
