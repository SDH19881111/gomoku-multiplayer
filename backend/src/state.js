export const rooms = {}; // key: roomCode, value: Room object
export const users = {}; // key: socketId, value: { nickname, currentRoom }

// Room Object Structure
/*
{
  roomId: '123456',
  hostNickname: 'Host1',
  rule33: true,
  status: 'waiting' | 'full' | 'playing' | 'finished',
  players: {
    black: socketId,
    white: socketId,
  },
  board: number[][], // 15x15 (0: empty, 1: black, 2: white)
  currentTurn: 'black' | 'white',
  undoCount: {
    black: 3,
    white: 3
  },
  pendingRequest: null // 'undo_black', 'undo_white', 'resign_black', 'rematch_black', etc.
}
*/
