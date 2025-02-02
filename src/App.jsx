import React, { useState, useEffect } from 'react';
import './App.css';

/* ============================
   基本ユーティリティ＆初期化
   ============================ */

// 盤面は9×9の2次元配列。各セルは null または { piece, side, promoted }
function initializeBoard() {
  const board = [];
  // Row0: 後手本陣
  board.push([
    { piece: '香', side: 'gote', promoted: false },
    { piece: '桂', side: 'gote', promoted: false },
    { piece: '銀', side: 'gote', promoted: false },
    { piece: '金', side: 'gote', promoted: false },
    { piece: '玉', side: 'gote', promoted: false },
    { piece: '金', side: 'gote', promoted: false },
    { piece: '銀', side: 'gote', promoted: false },
    { piece: '桂', side: 'gote', promoted: false },
    { piece: '香', side: 'gote', promoted: false },
  ]);
  // Row1: 後手 飛車・角
  board.push([
    null,
    { piece: '飛', side: 'gote', promoted: false },
    null,
    null,
    null,
    null,
    null,
    { piece: '角', side: 'gote', promoted: false },
    null,
  ]);
  // Row2: 後手歩兵列
  board.push(new Array(9).fill(null).map(() => ({ piece: '歩', side: 'gote', promoted: false })));
  // Row3～Row5: 空行
  for (let i = 0; i < 3; i++) {
    board.push(new Array(9).fill(null));
  }
  // Row6: 先手歩兵列
  board.push(new Array(9).fill(null).map(() => ({ piece: '歩', side: 'sente', promoted: false })));
  // Row7: 先手 角・飛車
  board.push([
    null,
    { piece: '角', side: 'sente', promoted: false },
    null,
    null,
    null,
    null,
    null,
    { piece: '飛', side: 'sente', promoted: false },
    null,
  ]);
  // Row8: 先手本陣
  board.push([
    { piece: '香', side: 'sente', promoted: false },
    { piece: '桂', side: 'sente', promoted: false },
    { piece: '銀', side: 'sente', promoted: false },
    { piece: '金', side: 'sente', promoted: false },
    { piece: '王', side: 'sente', promoted: false },
    { piece: '金', side: 'sente', promoted: false },
    { piece: '銀', side: 'sente', promoted: false },
    { piece: '桂', side: 'sente', promoted: false },
    { piece: '香', side: 'sente', promoted: false },
  ]);
  return board;
}

// 持ち駒は各プレイヤーの捕獲駒（文字列）を配列で管理
function initializeHands() {
  return { sente: [], gote: [] };
}

// 盤面のディープコピー
function cloneBoard(board) {
  return board.map(row => row.map(cell => (cell ? { ...cell } : null)));
}

// 範囲チェック
function isInside(row, col) {
  return row >= 0 && row < 9 && col >= 0 && col < 9;
}

// 成りマッピング（昇格後の駒表記）
const promotionMap = {
  '歩': 'と',
  '香': '成香',
  '桂': '成桂',
  '銀': '成銀',
  '飛': '竜',
  '角': '馬'
};
// 捕獲時に元に戻すための逆変換
const demotionMap = {
  'と': '歩',
  '成香': '香',
  '成桂': '桂',
  '成銀': '銀',
  '竜': '飛',
  '馬': '角'
};

// 成れるかどうかのチェック（既に成っていない場合）
function canPromote(piece) {
  if (piece.promoted) return false;
  return Object.keys(promotionMap).includes(piece.piece);
}

// 成りゾーンの判定（先手：row0～2、後手：row6～8）
function inPromotionZone(piece, row) {
  return piece.side === 'sente' ? row <= 2 : row >= 6;
}

// 自動成り（移動先が成りゾーンなら自動で成る）
function autoPromote(piece, toRow) {
  if (canPromote(piece) && inPromotionZone(piece, toRow)) {
    return { ...piece, promoted: true, piece: promotionMap[piece.piece] || piece.piece };
  }
  return piece;
}

// 盤面上に指定 side の王または玉が存在するか
function hasKing(board, side) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = board[r][c];
      if (cell && (cell.piece === '王' || cell.piece === '玉' || cell.piece === '玉' || cell.piece === '王') && cell.side === side) {
        return true;
      }
    }
  }
  return false;
}

/* ============================
   駒の移動・打の合法手取得
   ============================ */

function getLegalMovesForPiece(board, row, col) {
  const cell = board[row][col];
  if (!cell) return [];
  const moves = [];
  const piece = cell;
  const direction = piece.side === 'sente' ? -1 : 1;

  // 竜：飛車の遠方移動＋斜め1マス
  if (piece.piece === '竜') {
    const rookDirs = [[-1,0],[1,0],[0,-1],[0,1]];
    rookDirs.forEach(([dr, dc]) => {
      let r = row + dr, c = col + dc;
      while (isInside(r, c)) {
        if (!board[r][c]) {
          moves.push({ type: 'move', from: { row, col }, to: { row: r, col: c }, promote: false });
        } else {
          if (board[r][c].side !== piece.side)
            moves.push({ type: 'move', from: { row, col }, to: { row: r, col: c }, promote: false });
          break;
        }
        r += dr; c += dc;
      }
    });
    const diag = [[-1,-1], [-1,1], [1,-1], [1,1]];
    diag.forEach(([dr, dc]) => {
      const r = row + dr, c = col + dc;
      if (isInside(r, c) && (!board[r][c] || board[r][c].side !== piece.side))
        moves.push({ type: 'move', from: { row, col }, to: { row: r, col: c }, promote: false });
    });
    return moves;
  }
  // 馬：角の遠方移動＋上下左右一歩
  else if (piece.piece === '馬') {
    const bishopDirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
    bishopDirs.forEach(([dr, dc]) => {
      let r = row + dr, c = col + dc;
      while (isInside(r, c)) {
        if (!board[r][c]) {
          moves.push({ type: 'move', from: { row, col }, to: { row: r, col: c }, promote: false });
        } else {
          if (board[r][c].side !== piece.side)
            moves.push({ type: 'move', from: { row, col }, to: { row: r, col: c }, promote: false });
          break;
        }
        r += dr; c += dc;
      }
    });
    const orth = [[-1,0],[1,0],[0,-1],[0,1]];
    orth.forEach(([dr, dc]) => {
      const r = row + dr, c = col + dc;
      if (isInside(r, c) && (!board[r][c] || board[r][c].side !== piece.side))
        moves.push({ type: 'move', from: { row, col }, to: { row: r, col: c }, promote: false });
    });
    return moves;
  }
  // 成駒（と、成香、成桂、成銀）は金将と同じ動き
  else if (['と', '成香', '成桂', '成銀'].includes(piece.piece)) {
    const offsets = piece.side === 'sente'
      ? [[-1,0],[0,-1],[0,1],[1,0],[-1,-1],[-1,1]]
      : [[1,0],[0,-1],[0,1],[-1,0],[1,-1],[1,1]];
    offsets.forEach(([dr, dc]) => {
      const r = row + dr, c = col + dc;
      if (isInside(r, c) && (!board[r][c] || board[r][c].side !== piece.side))
        moves.push({ type: 'move', from: { row, col }, to: { row: r, col: c }, promote: false });
    });
    return moves;
  }
  // 未成駒の場合
  else {
    switch (piece.piece) {
      case '歩': {
        const r = row + direction, c = col;
        if (isInside(r, c) && (!board[r][c] || board[r][c].side !== piece.side))
          moves.push({ type: 'move', from: { row, col }, to: { row: r, col: c }, promote: inPromotionZone(piece, r) });
        break;
      }
      case '香': {
        for (let r = row + direction; isInside(r, col); r += direction) {
          if (!board[r][col]) {
            moves.push({ type: 'move', from: { row, col }, to: { row: r, col: col }, promote: inPromotionZone(piece, r) });
          } else {
            if (board[r][col].side !== piece.side)
              moves.push({ type: 'move', from: { row, col }, to: { row: r, col: col }, promote: inPromotionZone(piece, r) });
            break;
          }
        }
        break;
      }
      case '桂': {
        const r1 = row + 2 * direction, c1 = col - 1;
        const r2 = row + 2 * direction, c2 = col + 1;
        if (isInside(r1, c1) && (!board[r1][c1] || board[r1][c1].side !== piece.side))
          moves.push({ type: 'move', from: { row, col }, to: { row: r1, col: c1 }, promote: inPromotionZone(piece, r1) });
        if (isInside(r2, c2) && (!board[r2][c2] || board[r2][c2].side !== piece.side))
          moves.push({ type: 'move', from: { row, col }, to: { row: r2, col: c2 }, promote: inPromotionZone(piece, r2) });
        break;
      }
      case '銀': {
        const offsets = [
          { dr: direction, dc: 0 },
          { dr: direction, dc: -1 },
          { dr: direction, dc: 1 },
          { dr: -direction, dc: -1 },
          { dr: -direction, dc: 1 }
        ];
        offsets.forEach(({ dr, dc }) => {
          const r = row + dr, c = col + dc;
          if (isInside(r, c) && (!board[r][c] || board[r][c].side !== piece.side))
            moves.push({ type: 'move', from: { row, col }, to: { row: r, col: c }, promote: inPromotionZone(piece, r) });
        });
        break;
      }
      case '金': {
        const offsets = piece.side === 'sente'
          ? [[-1,0],[0,-1],[0,1],[1,0],[-1,-1],[-1,1]]
          : [[1,0],[0,-1],[0,1],[-1,0],[1,-1],[1,1]];
        offsets.forEach(([dr, dc]) => {
          const r = row + dr, c = col + dc;
          if (isInside(r, c) && (!board[r][c] || board[r][c].side !== piece.side))
            moves.push({ type: 'move', from: { row, col }, to: { row: r, col: c }, promote: false });
        });
        break;
      }
      case '玉':
      case '王': {
        const offsets = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
        offsets.forEach(([dr, dc]) => {
          const r = row + dr, c = col + dc;
          if (isInside(r, c) && (!board[r][c] || board[r][c].side !== piece.side))
            moves.push({ type: 'move', from: { row, col }, to: { row: r, col: c }, promote: false });
        });
        break;
      }
      case '飛': {
        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        dirs.forEach(([dr, dc]) => {
          let r = row + dr, c = col + dc;
          while (isInside(r, c)) {
            if (!board[r][c]) {
              moves.push({ type: 'move', from: { row, col }, to: { row: r, col: c }, promote: inPromotionZone(piece, r) });
            } else {
              if (board[r][c].side !== piece.side)
                moves.push({ type: 'move', from: { row, col }, to: { row: r, col: c }, promote: inPromotionZone(piece, r) });
              break;
            }
            r += dr; c += dc;
          }
        });
        break;
      }
      case '角': {
        const dirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
        dirs.forEach(([dr, dc]) => {
          let r = row + dr, c = col + dc;
          while (isInside(r, c)) {
            if (!board[r][c]) {
              moves.push({ type: 'move', from: { row, col }, to: { row: r, col: c }, promote: inPromotionZone(piece, r) });
            } else {
              if (board[r][c].side !== piece.side)
                moves.push({ type: 'move', from: { row, col }, to: { row: r, col: c }, promote: inPromotionZone(piece, r) });
              break;
            }
            r += dr; c += dc;
          }
        });
        break;
      }
      default:
        break;
    }
    return moves;
  }
}

function getLegalDropsForPiece(board, handPiece, side) {
  const moves = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (!board[r][c]) {
        if (handPiece === '歩') {
          let alreadyPawn = false;
          for (let row = 0; row < 9; row++) {
            const cell = board[row][c];
            if (cell && cell.side === side && cell.piece === '歩' && !cell.promoted) {
              alreadyPawn = true;
              break;
            }
          }
          if (alreadyPawn) continue;
        }
        if (side === 'sente') {
          if (['歩','香'].includes(handPiece) && r === 0) continue;
          if (handPiece === '桂' && (r === 0 || r === 1)) continue;
        } else {
          if (['歩','香'].includes(handPiece) && r === 8) continue;
          if (handPiece === '桂' && (r === 7 || r === 8)) continue;
        }
        moves.push({ type: 'drop', piece: handPiece, to: { row: r, col: c } });
      }
    }
  }
  return moves;
}

function getAllLegalMoves(board, hands, side) {
  let moves = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = board[r][c];
      if (cell && cell.side === side) {
        moves = moves.concat(getLegalMovesForPiece(board, r, c));
      }
    }
  }
  hands[side].forEach((handPiece, index) => {
    moves = moves.concat(
      getLegalDropsForPiece(board, handPiece, side).map(m => ({
        ...m,
        fromHandIndex: index
      }))
    );
  });
  return moves;
}

function capturedPiece(piece) {
  if (piece.piece === '王' || piece.piece === '玉') return null;
  let base = piece.piece;
  if (piece.promoted && demotionMap[base]) {
    base = demotionMap[base];
  }
  return base;
}

function executeMove(board, hands, move, currentSide) {
  const newBoard = cloneBoard(board);
  const newHands = { sente: [...hands.sente], gote: [...hands.gote] };

  if (move.type === 'move') {
    const { row, col } = move.from;
    let movingPiece = newBoard[row][col];
    newBoard[row][col] = null;
    const target = newBoard[move.to.row][move.to.col];
    if (target) {
      const cap = capturedPiece(target);
      if (cap) {
        newHands[currentSide].push(cap);
      }
    }
    movingPiece = move.promote ? autoPromote(movingPiece, move.to.row) : movingPiece;
    newBoard[move.to.row][move.to.col] = movingPiece;
  } else if (move.type === 'drop') {
    newBoard[move.to.row][move.to.col] = { piece: move.piece, side: currentSide, promoted: false };
    newHands[currentSide].splice(move.fromHandIndex, 1);
  }
  return { board: newBoard, hands: newHands };
}

/* ============================
   盤面評価・AI（ミニマックス探索、深さ3）
   ============================ */

const pieceValues = {
  '歩': 1,
  '香': 3,
  '桂': 3,
  '銀': 5,
  '金': 6,
  '玉': 100,
  '王': 100,
  'と': 1.5,
  '成香': 3.5,
  '成桂': 3.5,
  '成銀': 5.5,
  '竜': 11,
  '馬': 9
};

function evaluateBoardState(board, side) {
  let score = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = board[r][c];
      if (cell) {
        if (cell.side === side) {
          score += pieceValues[cell.piece] || 0;
        } else {
          score -= pieceValues[cell.piece] || 0;
        }
      }
    }
  }
  return score;
}

function isGameOver(board) {
  // ゲーム終了の条件：どちらかの王・玉が存在しない、または合法手が一切ない（詰み）
  return !hasKing(board, 'sente') || !hasKing(board, 'gote');
}

function minimax(board, hands, depth, maximizingPlayer) {
  if (depth === 0 || isGameOver(board)) {
    return evaluateBoardState(board, 'gote');
  }
  if (maximizingPlayer) {
    let maxEval = -Infinity;
    const moves = getAllLegalMoves(board, hands, 'gote');
    for (const move of moves) {
      const result = executeMove(board, hands, move, 'gote');
      const moveEval = minimax(result.board, result.hands, depth - 1, false);
      if (moveEval > maxEval) {
        maxEval = moveEval;
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    const moves = getAllLegalMoves(board, hands, 'sente');
    for (const move of moves) {
      const result = executeMove(board, hands, move, 'sente');
      const moveEval = minimax(result.board, result.hands, depth - 1, true);
      if (moveEval < minEval) {
        minEval = moveEval;
      }
    }
    return minEval;
  }
}

function makeAIMove(board, hands) {
  const moves = getAllLegalMoves(board, hands, 'gote');
  if (moves.length === 0) return null;
  let bestMove = null;
  let bestEval = -Infinity;
  for (const move of moves) {
    const result = executeMove(board, hands, move, 'gote');
    const moveEval = minimax(result.board, result.hands, 3, false); // 深さ3
    if (moveEval > bestEval) {
      bestEval = moveEval;
      bestMove = move;
    }
  }
  return bestMove;
}

/* ============================
   ShogiBoard コンポーネント（UI）
   ============================ */

function ShogiBoard() {
  const [board, setBoard] = useState(initializeBoard());
  const [hands, setHands] = useState(initializeHands());
  const [selected, setSelected] = useState(null); // { type: 'board' or 'hand', ... }
  const [legalMoves, setLegalMoves] = useState([]);
  const [turn, setTurn] = useState('sente'); // sente:プレイヤー, gote:AI
  const [lastMove, setLastMove] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);

  // 現在のターン開始時に合法手がない場合は詰みと判断
  useEffect(() => {
    if (!gameOver) {
      const moves = getAllLegalMoves(board, hands, turn);
      if (moves.length === 0) {
        setGameOver(true);
        setWinner(turn === 'sente' ? 'AI (後手)' : 'あなた (先手)');
      }
    }
  }, [turn, board, hands, gameOver]);

  const resetGame = () => {
    setBoard(initializeBoard());
    setHands(initializeHands());
    setSelected(null);
    setLegalMoves([]);
    setLastMove(null);
    setTurn('sente');
    setGameOver(false);
    setWinner(null);
  };

  const handleBoardClick = (row, col) => {
    if (gameOver) return;
    const cell = board[row][col];
    if (selected) {
      if (selected.type === 'board') {
        const isLegal = legalMoves.some(move => move.to.row === row && move.to.col === col);
        if (isLegal) {
          const move = legalMoves.find(move => move.to.row === row && move.to.col === col);
          const result = executeMove(board, hands, move, turn);
          setBoard(result.board);
          setHands(result.hands);
          setLastMove(move);
          setSelected(null);
          setLegalMoves([]);
          setTurn('gote');
        } else {
          if (cell && cell.side === turn) {
            setSelected({ type: 'board', row, col });
            setLegalMoves(getLegalMovesForPiece(board, row, col));
          } else {
            setSelected(null);
            setLegalMoves([]);
          }
        }
      } else if (selected.type === 'hand') {
        const dropMoves = getLegalDropsForPiece(board, selected.piece, turn).filter(
          move => move.to.row === row && move.to.col === col
        );
        if (dropMoves.length > 0) {
          const move = { type: 'drop', piece: selected.piece, fromHandIndex: selected.handIndex, to: { row, col } };
          const result = executeMove(board, hands, move, turn);
          setBoard(result.board);
          setHands(result.hands);
          setLastMove(move);
          setSelected(null);
          setLegalMoves([]);
          setTurn('gote');
        } else {
          setSelected(null);
          setLegalMoves([]);
        }
      }
    } else {
      if (cell && cell.side === turn) {
        setSelected({ type: 'board', row, col });
        setLegalMoves(getLegalMovesForPiece(board, row, col));
      }
    }
  };

  const handleHandClick = (piece, index) => {
    if (gameOver || turn !== 'sente') return;
    setSelected({ type: 'hand', piece, handIndex: index });
    setLegalMoves(getLegalDropsForPiece(board, piece, turn));
  };

  // AIの手番
  useEffect(() => {
    if (turn === 'gote' && !gameOver) {
      setTimeout(() => {
        const aiMove = makeAIMove(board, hands);
        if (aiMove) {
          const result = executeMove(board, hands, aiMove, 'gote');
          setBoard(result.board);
          setHands(result.hands);
          setLastMove(aiMove);
        }
        setTurn('sente');
        setSelected(null);
        setLegalMoves([]);
      }, 500);
    }
  }, [turn, board, hands, gameOver]);

  return (
    <div>
      {gameOver && (
        <div className="game-over">
          <h2>ゲーム終了</h2>
          <p>勝者: {winner}</p>
          <button onClick={resetGame}>再挑戦</button>
        </div>
      )}
      <div className="board">
        {board.map((rowArr, rowIdx) => (
          <div key={rowIdx} className="board-row">
            {rowArr.map((cell, colIdx) => {
              const isSelected = selected && selected.type === 'board' && selected.row === rowIdx && selected.col === colIdx;
              const isLegal = legalMoves.some(move => move.to.row === rowIdx && move.to.col === colIdx);
              const isLastMove = lastMove && lastMove.to.row === rowIdx && lastMove.to.col === colIdx;
              return (
                <div
                  key={colIdx}
                  className={`board-cell ${isSelected ? 'selected' : ''} ${isLegal ? 'legal' : ''} ${isLastMove ? 'last-move' : ''}`}
                  onClick={() => handleBoardClick(rowIdx, colIdx)}
                >
                  {cell && (
                    <span className={cell.side === 'gote' ? 'opponent-piece' : ''}>
                      {cell.piece}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="hand-area">
        <div className="hand sente-hand">
          <h3>持ち駒（自分）</h3>
          {hands.sente.map((piece, index) => (
            <button key={index} onClick={() => handleHandClick(piece, index)}>
              {piece}
            </button>
          ))}
        </div>
        <div className="hand gote-hand">
          <h3>持ち駒（相手）</h3>
          {hands.gote.map((piece, index) => (
            <button key={index} disabled>
              {piece}
            </button>
          ))}
        </div>
      </div>
      <div className="turn-indicator">
        手番: {turn === 'sente' ? '先手 (あなた)' : '後手 (AI)'}
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <h1>将棋アプリ - AI対戦</h1>
      <ShogiBoard />
    </div>
  );
}

export default App;
