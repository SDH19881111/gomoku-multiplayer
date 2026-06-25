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

/**
 * 3-3 금수 검사
 * 놓으려는 위치에 돌을 놓았을 때, 2개 이상의 "활삼(열린 3)"이 동시에 만들어지면 금수
 * 
 * 활삼(Open Three, 열린 3): 한 수를 더 두면 "활사(열린 4)"가 되는 3개 돌 배치
 * 활사(Open Four): 양쪽이 모두 비어있는 4개 연속 돌 (_OOOO_)
 */
export const check33 = (board, row, col, color) => {
  const directions = [
    [1, 0],   // 세로
    [0, 1],   // 가로  
    [1, 1],   // 대각선 ↘
    [1, -1]   // 대각선 ↙
  ];

  // 임시로 돌을 놓아봄
  const tempBoard = board.map(r => [...r]);
  tempBoard[row][col] = color;

  let open3Count = 0;

  for (const [dr, dc] of directions) {
    if (isOpen3(tempBoard, row, col, dr, dc, color)) {
      open3Count++;
    }
  }

  return open3Count >= 2;
};

/**
 * 특정 방향에서 해당 위치를 포함하는 "활삼"이 있는지 검사
 * 
 * 활삼 패턴 (O = 같은 색, _ = 빈칸, X = 벽/상대색):
 *   패턴1: _OOO_  (연속 3, 양끝 빈칸)
 *   패턴2: _O_OO_ (1+빈+2, 양끝 빈칸)  
 *   패턴3: _OO_O_ (2+빈+1, 양끝 빈칸)
 * 
 * 단, 활삼이 되려면 한 수를 더 놓아 활사(_OOOO_)를 만들 수 있어야 함
 */
const isOpen3 = (board, row, col, dr, dc, color) => {
  // 해당 방향으로 -5 ~ +5 범위의 라인을 추출
  const line = [];
  const positions = [];
  
  for (let i = -5; i <= 5; i++) {
    const nr = row + dr * i;
    const nc = col + dc * i;
    if (nr < 0 || nr >= 15 || nc < 0 || nc >= 15) {
      line.push(-1); // 벽 (범위 밖)
    } else if (board[nr][nc] === color) {
      line.push(1); // 같은 색
    } else if (board[nr][nc] === 0) {
      line.push(0); // 빈칸
    } else {
      line.push(-1); // 상대 색
    }
    positions.push(i);
  }

  // 놓은 돌의 인덱스 (i=0 → 인덱스 5)
  const placedIdx = 5;

  // 활삼 패턴 검사
  // 패턴1: _OOO_ (연속 3개, 양끝 빈칸)
  // 패턴2: _O_OO_ (띈 3: 1+gap+2, 양끝 빈칸)
  // 패턴3: _OO_O_ (띈 3: 2+gap+1, 양끝 빈칸)
  
  // 먼저 연속 3 패턴 (_OOO_) 검사
  // 놓은 돌을 포함하는 연속 3의 시작점을 모두 찾음
  for (let start = placedIdx - 2; start <= placedIdx; start++) {
    if (start < 0 || start + 2 >= line.length) continue;
    
    // start ~ start+2 가 모두 같은 색이어야 함
    if (line[start] !== 1 || line[start + 1] !== 1 || line[start + 2] !== 1) continue;
    
    // 양쪽 한 칸 바깥이 빈칸이어야 함
    const leftIdx = start - 1;
    const rightIdx = start + 3;
    if (leftIdx < 0 || rightIdx >= line.length) continue;
    if (line[leftIdx] !== 0 || line[rightIdx] !== 0) continue;
    
    // 추가 확인: 이 활삼이 진짜 활사로 발전할 수 있는지
    // 즉, _OOO_ 패턴에서 빈칸 하나에 돌을 놓으면 _OOOO_ 가 되는지
    // 왼쪽 빈칸에 놓으면: ?OOOO_ → 왼쪽 바깥도 빈칸이어야 활사
    // 오른쪽 빈칸에 놓으면: _OOOO? → 오른쪽 바깥도 빈칸이어야 활사
    
    const leftLeft = leftIdx - 1;
    const rightRight = rightIdx + 1;
    
    const canMakeOpen4Left = leftLeft < 0 ? false : (line[leftLeft] === 0 || line[leftLeft] === -1 ? line[leftLeft] === 0 : false);
    const canMakeOpen4Right = rightRight >= line.length ? false : (line[rightRight] === 0 || line[rightRight] === -1 ? line[rightRight] === 0 : false);
    
    // 왼쪽에 놓으면 활사가 되려면: leftLeft이 빈칸 + rightIdx가 빈칸 (이미 확인됨)
    // 오른쪽에 놓으면 활사가 되려면: leftIdx가 빈칸 (이미 확인됨) + rightRight이 빈칸
    
    if (canMakeOpen4Left || canMakeOpen4Right) {
      // 단, 놓은 돌이 이 3개 중 하나여야 함
      if (placedIdx >= start && placedIdx <= start + 2) {
        return true;
      }
    }
  }

  // 띈 3 패턴: _O_OO_ 또는 _OO_O_ 검사
  // 놓은 돌을 포함하는 "3개 돌 + 1개 빈칸" 패턴
  
  // 패턴 _XaXbXc_ 에서 Xa, Xb, Xc 중 하나가 빈칸이고 나머지가 같은 색
  // 전체 길이 6: 빈 + (4칸: 돌3+빈1) + 빈
  
  // _O_OO_ 패턴 검사
  for (let start = placedIdx - 3; start <= placedIdx; start++) {
    if (start < 0 || start + 3 >= line.length) continue;
    const leftIdx = start - 1;
    const rightIdx = start + 4;
    if (leftIdx < 0 || rightIdx >= line.length) continue;
    
    // _O_OO_ : line[leftIdx]=0, line[start]=1, line[start+1]=0, line[start+2]=1, line[start+3]=1, line[rightIdx]=0
    if (line[leftIdx] === 0 && line[start] === 1 && line[start + 1] === 0 && 
        line[start + 2] === 1 && line[start + 3] === 1 && line[rightIdx] === 0) {
      if (placedIdx >= start && placedIdx <= start + 3 && placedIdx !== start + 1) {
        return true;
      }
    }
    
    // _OO_O_ : line[leftIdx]=0, line[start]=1, line[start+1]=1, line[start+2]=0, line[start+3]=1, line[rightIdx]=0
    if (line[leftIdx] === 0 && line[start] === 1 && line[start + 1] === 1 && 
        line[start + 2] === 0 && line[start + 3] === 1 && line[rightIdx] === 0) {
      if (placedIdx >= start && placedIdx <= start + 3 && placedIdx !== start + 2) {
        return true;
      }
    }
  }

  return false;
};
