import React, { useState, useEffect } from "react";
import { Chess, Square } from "chess.js";

// Clean High-Contrast SVG Chess Pieces
const PIECE_SVGS: Record<string, string> = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟"
};

export default function ChessGame() {
  const [game, setGame] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);
  const [gameMode, setGameMode] = useState<"ai" | "pvp">("ai");
  const [aiDifficulty, setAiDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [status, setStatus] = useState("À vous de jouer ! (Blancs)");

  useEffect(() => {
    updateGameStatus();

    if (gameMode === "ai" && game.turn() === "b" && !game.isGameOver()) {
      const timer = setTimeout(() => {
        makeComputerMove();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [game.fen(), gameMode]);

  function updateGameStatus() {
    if (game.isCheckmate()) {
      setStatus(`Échec et mat ! Victoire des ${game.turn() === "w" ? "Noirs" : "Blancs"} !`);
    } else if (game.isDraw()) {
      setStatus("Partie nulle !");
    } else if (game.inCheck()) {
      setStatus(`Échec ! Tour aux ${game.turn() === "w" ? "Blancs" : "Noirs"}`);
    } else {
      setStatus(`Tour aux ${game.turn() === "w" ? "Blancs (Vous)" : "Noirs"}`);
    }
  }

  function handleSquareClick(sq: Square) {
    if (game.isGameOver()) return;
    if (gameMode === "ai" && game.turn() === "b") return;

    if (selectedSquare) {
      if (selectedSquare === sq) {
        setSelectedSquare(null);
        setPossibleMoves([]);
        return;
      }

      try {
        const move = game.move({
          from: selectedSquare,
          to: sq,
          promotion: "q",
        });

        if (move) {
          setGame(new Chess(game.fen()));
          setSelectedSquare(null);
          setPossibleMoves([]);
          return;
        }
      } catch (e) {
        // Move invalid
      }
    }

    const piece = game.get(sq);
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(sq);
      const moves = game.moves({ square: sq, verbose: true });
      setPossibleMoves(moves.map((m) => m.to as Square));
    } else {
      setSelectedSquare(null);
      setPossibleMoves([]);
    }
  }

  function makeComputerMove() {
    const validMoves = game.moves({ verbose: true });
    if (validMoves.length === 0) return;

    let chosenMove = validMoves[0];

    if (aiDifficulty === "easy") {
      chosenMove = validMoves[Math.floor(Math.random() * validMoves.length)];
    } else {
      const captures = validMoves.filter((m) => m.captured);
      const checks = validMoves.filter((m) => m.san.includes("+"));

      if (aiDifficulty === "hard" && checks.length > 0) {
        chosenMove = checks[Math.floor(Math.random() * checks.length)];
      } else if (captures.length > 0) {
        chosenMove = captures[Math.floor(Math.random() * captures.length)];
      } else {
        chosenMove = validMoves[Math.floor(Math.random() * validMoves.length)];
      }
    }

    game.move(chosenMove);
    setGame(new Chess(game.fen()));
  }

  function resetGame() {
    setGame(new Chess());
    setSelectedSquare(null);
    setPossibleMoves([]);
  }

  const board = game.board();

  return (
    <div className="flex h-full flex-col bg-nexus-bg text-nexus-text p-4 space-y-3">
      {/* Top Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-nexus-border pb-2.5">
        <div className="flex gap-2">
          <button
            onClick={() => setGameMode("ai")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              gameMode === "ai"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                : "border border-nexus-border text-nexus-muted hover:text-white"
            }`}
          >
            🤖 Mode IA
          </button>
          <button
            onClick={() => setGameMode("pvp")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              gameMode === "pvp"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                : "border border-nexus-border text-nexus-muted hover:text-white"
            }`}
          >
            👥 2 Joueurs
          </button>
        </div>

        {gameMode === "ai" && (
          <div className="flex items-center gap-1 text-xs text-nexus-muted">
            <span>IA:</span>
            {(["easy", "medium", "hard"] as const).map((diff) => (
              <button
                key={diff}
                onClick={() => setAiDifficulty(diff)}
                className={`rounded-lg px-2 py-0.5 text-[10px] uppercase font-bold transition-all ${
                  aiDifficulty === diff ? "bg-white/20 text-white" : "hover:text-white"
                }`}
              >
                {diff === "easy" ? "Facile" : diff === "medium" ? "Moyen" : "Hard"}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={resetGame}
          className="nx-btn nx-btn-secondary text-xs"
        >
          🔄 Recommencer
        </button>
      </div>

      {/* Banner */}
      <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-center text-xs font-bold text-purple-200">
        {status}
      </div>

      {/* Chessboard Area */}
      <div className="flex-1 flex items-center justify-center p-2">
        <div className="grid grid-cols-8 grid-rows-8 w-72 h-72 sm:w-80 sm:h-80 border-4 border-[#334155] rounded-2xl overflow-hidden shadow-2xl">
          {board.map((row, rIdx) =>
            row.map((cell, cIdx) => {
              const file = String.fromCharCode(97 + cIdx);
              const rank = 8 - rIdx;
              const sq = `${file}${rank}` as Square;
              const isDark = (rIdx + cIdx) % 2 === 1;
              const isSelected = selectedSquare === sq;
              const isPossible = possibleMoves.includes(sq);

              const pieceKey = cell ? `${cell.color}${cell.type.toUpperCase()}` : null;
              const symbol = pieceKey ? PIECE_SVGS[pieceKey] : "";

              return (
                <div
                  key={sq}
                  onClick={() => handleSquareClick(sq)}
                  className={`relative flex items-center justify-center cursor-pointer select-none text-2xl sm:text-3xl font-bold transition-all ${
                    isDark ? "bg-[#708090]" : "bg-[#f1f5f9]"
                  } ${isSelected ? "!bg-amber-400/90 ring-4 ring-amber-300 z-10" : ""} ${
                    isPossible ? "ring-2 ring-emerald-400 ring-inset" : ""
                  }`}
                >
                  {symbol && (
                    <span
                      className={`transition-transform duration-150 ${
                        cell?.color === "w"
                          ? "text-amber-100 drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]"
                          : "text-slate-950 drop-shadow-[0_0_2px_rgba(255,255,255,0.9)] font-extrabold"
                      }`}
                    >
                      {symbol}
                    </span>
                  )}
                  {isPossible && !cell && (
                    <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-md animate-pulse" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
