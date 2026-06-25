export const generateRoomCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const createEmptyBoard = () => {
  return Array(15).fill(null).map(() => Array(15).fill(0));
};

export const checkWin = (board, row, col, color) => {
  const directions = [
    [1, 0], [0, 1], [1, 1], [1, -1]
  ];

  for (let [dr, dc] of directions) {
    let count = 1;
    for (let i = 1; i < 5; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r < 0 || r >= 15 || c < 0 || c >= 15 || board[r][c] !== color) break;
      count++;
    }
    for (let i = 1; i < 5; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r < 0 || r >= 15 || c < 0 || c >= 15 || board[r][c] !== color) break;
      count++;
    }
    if (count >= 5) return true;
  }
  return false;
};

// 기본 3-3 검사 로직
export const check33 = (board, row, col, color) => {
  const directions = [
    [1, 0], [0, 1], [1, 1], [1, -1]
  ];

  let open3Count = 0;

  const tempBoard = board.map(r => [...r]);
  tempBoard[row][col] = color;

  for (let [dr, dc] of directions) {
      if (isOpen3(tempBoard, row, col, dr, dc, color)) {
          open3Count++;
      }
  }

  return open3Count >= 2;
};

const isOpen3 = (board, r, c, dr, dc, color) => {
    let line = "";
    for (let i = -4; i <= 4; i++) {
        const nr = r + dr * i;
        const nc = c + dc * i;
        if (nr < 0 || nr >= 15 || nc < 0 || nc >= 15) {
            line += "2"; 
        } else if (board[nr][nc] === 0) {
            line += "0"; 
        } else if (board[nr][nc] === color) {
            line += "1"; 
        } else {
            line += "2"; 
        }
    }

    for (let emptyIdx = 0; emptyIdx < line.length; emptyIdx++) {
        if (line[emptyIdx] === "0") {
            const testLine = line.substring(0, emptyIdx) + "1" + line.substring(emptyIdx + 1);
            let matchIdx = testLine.indexOf("011110");
            while (matchIdx !== -1) {
                const emptyIsPart = emptyIdx >= matchIdx + 1 && emptyIdx <= matchIdx + 4;
                const placedIsPart = 4 >= matchIdx + 1 && 4 <= matchIdx + 4;
                
                if (emptyIsPart && placedIsPart) {
                    return true;
                }
                matchIdx = testLine.indexOf("011110", matchIdx + 1);
            }
        }
    }
    return false;
};
