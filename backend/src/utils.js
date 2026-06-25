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
  if (color !== 1) return false; // 흑돌만 3-3 적용

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
            line += "W"; 
        } else if (board[nr][nc] === 0) {
            line += "0"; 
        } else if (board[nr][nc] === color) {
            line += "1"; 
        } else {
            line += "2"; 
        }
    }

    const patterns = [
        "01110",
        "010110",
        "011010"
    ];

    for (let pattern of patterns) {
        let idx = line.indexOf(pattern);
        while (idx !== -1) {
            // 이번에 착수한 돌(index 4)이 해당 패턴에 포함되어 있는지 확인
            if (4 >= idx && 4 < idx + pattern.length) {
                // 패턴 자체에 포함되어 있고, 그 돌이 1인 경우
                if (line[4] === "1") {
                    return true;
                }
            }
            idx = line.indexOf(pattern, idx + 1);
        }
    }
    return false;
};
