import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

// Theme and style constants
const COLORS = {
  background: "#ffffff",
  grid: "#e9ecef",
  snake: "#228B22",   // Primary
  snakeHead: "#FFD700", // Accent
  food: "#FFD700",     // Accent
  text: "#000000",     // Secondary (for dark on light)
};
const BOARD_SIZE = 16;
const INITIAL_SPEED = 120; // ms per move
const MIN_SPEED = 60;
const SPEED_UP_SCORE = 10; // Speed up every N points

const getRandomCell = (cells, exclude) => {
  // Returns a {x, y} object not in the exclude array
  let available = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (!exclude.some((e) => e.x === x && e.y === y)) available.push({ x, y });
    }
  }
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
};

const initialSnake = [
  { x: Math.floor(BOARD_SIZE / 2), y: Math.floor(BOARD_SIZE / 2) },
  { x: Math.floor(BOARD_SIZE / 2), y: Math.floor(BOARD_SIZE / 2) + 1 },
  { x: Math.floor(BOARD_SIZE / 2), y: Math.floor(BOARD_SIZE / 2) + 2 },
];

const directions = {
  ArrowUp: { x: 0, y: -1, opposite: "ArrowDown" },
  ArrowDown: { x: 0, y: 1, opposite: "ArrowUp" },
  ArrowLeft: { x: -1, y: 0, opposite: "ArrowRight" },
  ArrowRight: { x: 1, y: 0, opposite: "ArrowLeft" },
};

// Helper: detects if two cells overlap
const cellEquals = (a, b) => a.x === b.x && a.y === b.y;

/**
 * PUBLIC_INTERFACE
 * Main App component for the Snake Game.
 * Handles game logic, board rendering, keyboard controls, and responsive minimal design.
 */
function App() {
  // Game state
  const [snake, setSnake] = useState(initialSnake);
  const [direction, setDirection] = useState("ArrowUp");
  const [queuedDir, setQueuedDir] = useState("ArrowUp"); // to allow for fast turning
  const [food, setFood] = useState(getRandomCell([], initialSnake));
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // Responsive grid size
  const boardRef = useRef();
  const [cellSize, setCellSize] = useState(24);

  // Lifecycle: setup event listeners for resizing and keyboard
  useEffect(() => {
    const resize = () => {
      if (!boardRef.current) return;
      // Fit grid to window, with a max cell size
      const padding = 32;
      const available = Math.min(window.innerWidth, window.innerHeight) - padding;
      setCellSize(Math.floor(available / BOARD_SIZE));
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Handle keyboard direction (arrows / WASD)
  useEffect(() => {
    if (!running || gameOver) return;
    const handleKeyDown = (e) => {
      const dirKey =
        directions[e.key] ||
        (e.key === "w" && directions.ArrowUp) ||
        (e.key === "s" && directions.ArrowDown) ||
        (e.key === "a" && directions.ArrowLeft) ||
        (e.key === "d" && directions.ArrowRight);
      if (!dirKey) return;
      // Prevent reversing directly
      if (dirKey.opposite !== direction) {
        setQueuedDir(e.key.length === 1 ? ({ w: "ArrowUp", a: "ArrowLeft", s: "ArrowDown", d: "ArrowRight" }[e.key]) : e.key);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [direction, running, gameOver]);
  
  // Main game tick
  useEffect(() => {
    if (!running || gameOver) return;
    const tick = () => setSnake((prev) => {
      let newDir = queuedDir;
      setDirection(newDir);
      const { x: dx, y: dy } = directions[newDir];
      const newHead = { x: prev[0].x + dx, y: prev[0].y + dy };

      // Wall collision
      if (newHead.x < 0 || newHead.y < 0 || newHead.x >= BOARD_SIZE || newHead.y >= BOARD_SIZE) {
        setGameOver(true);
        setRunning(false);
        return prev;
      }
      // Self collision
      if (prev.some((cell) => cellEquals(cell, newHead))) {
        setGameOver(true);
        setRunning(false);
        return prev;
      }
      // Move snake
      let newSnake;
      if (cellEquals(newHead, food)) {
        // Eat food: grow, increase score, maybe speed up
        newSnake = [newHead, ...prev];
        setScore((s) => s + 1);
        if ((score + 1) % SPEED_UP_SCORE === 0 && speed > MIN_SPEED) {
          setSpeed((sp) => Math.max(MIN_SPEED, sp - 8));
        }
        setFood(getRandomCell([], newSnake));
      } else {
        newSnake = [newHead, ...prev.slice(0, -1)];
      }
      return newSnake;
    });
    const interval = setTimeout(tick, speed);
    return () => clearTimeout(interval);
    // speed and queuedDir are referenced
  }, [speed, running, queuedDir, direction, food, score, gameOver]);

  // Start/Restart game
  const startGame = useCallback(() => {
    setSnake(initialSnake);
    setDirection("ArrowUp");
    setQueuedDir("ArrowUp");
    setFood(getRandomCell([], initialSnake));
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setRunning(true);
    setGameOver(false);
  }, []);

  // Render the grid: each cell as a div, minimal style
  function renderBoard() {
    let grid = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const isHead = cellEquals(snake[0], { x, y });
        const isSnake = snake.some((segment, idx) => idx > 0 && cellEquals(segment, { x, y }));
        const isFood = cellEquals(food, { x, y });
        grid.push(
          <div
            data-testid={`cell-${x}-${y}`}
            key={`${x}-${y}`}
            style={{
              width: cellSize,
              height: cellSize,
              background: isHead
                ? COLORS.snakeHead
                : isSnake
                ? COLORS.snake
                : isFood
                ? COLORS.food
                : COLORS.background,
              border: `1px solid ${COLORS.grid}`,
              transition: "background 0.1s",
              boxSizing: "border-box",
              borderRadius: isHead ? "40%" : isSnake ? "26%" : "4px",
              display: "inline-block",
            }}
          />
        );
      }
    }
    // Style grid as flex wrap for minimal CSS
    return (
      <div
        ref={boardRef}
        className="snake-board"
        role="grid"
        aria-label="snake-board"
        tabIndex={-1}
        style={{
          width: BOARD_SIZE * cellSize,
          height: BOARD_SIZE * cellSize,
          background: COLORS.background,
          border: `2.5px solid ${COLORS.primary}`,
          boxShadow: "0 2px 16px 0 rgba(0,0,0,0.08)",
          display: "flex",
          flexWrap: "wrap",
          margin: "0 auto",
          borderRadius: "20px",
          transition: "border-color 0.2s",
          outline: "none"
        }}
      >
        {grid}
      </div>
    );
  }

  // Controls/Instructions UI
  function renderControls() {
    return (
      <div className="snake-controls" style={{
        marginTop: 24,
        color: COLORS.text,
        fontSize: 15,
        letterSpacing: "0.01em"
      }}>
        <div>
          <span style={{fontWeight: 600, color: COLORS.primary}}>Controls:</span>
          <span>  Arrow keys or W/A/S/D</span>
        </div>
        <div>
          <span style={{fontWeight: 600, color: COLORS.primary}}>Goal:</span>
          <span> Eat food, avoid walls and yourself!</span>
        </div>
        <div style={{color: "#888", fontSize: 13, marginTop: 8}} aria-label="instructions-note">
          <span>Press <b>Space</b> or <b>Enter</b> to start or restart.</span>
        </div>
      </div>
    );
  }

  // Listen for spacebar/enter game start
  useEffect(() => {
    const handler = (e) => {
      if (([" ", "Enter"].includes(e.key) || ["Spacebar"].includes(e.code)) && (!running || gameOver)) {
        startGame();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [running, gameOver, startGame]);

  // PUBLIC_INTERFACE
  return (
    <div
      className="App"
      style={{
        background: COLORS.background,
        minHeight: "100vh",
        fontFamily: "Inter,Segoe UI,Arial,sans-serif",
        color: COLORS.text,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <main
        style={{
          flex: 1,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 12,
        }}
      >
        {/* Score at the top */}
        <div className="snake-score-bar" style={{
          fontWeight: 700,
          fontSize: 24,
          letterSpacing: 0.5,
          color: COLORS.snake,
          marginBottom: 14
        }}>
          <span>🐍 SCORE: </span>
          <span data-testid="score" style={{ color: COLORS.snakeHead }}>{score}</span>
        </div>
        {/* Game board at center */}
        <div style={{
          margin: "0 auto",
          userSelect: "none",
          background: COLORS.background,
          padding: 8,
          borderRadius: 24
        }}>
          {renderBoard()}
          {gameOver && (
            <div style={{
              position: "absolute",
              left: "0",
              top: "50%",
              width: "100%",
              transform: "translateY(-50%)",
              textAlign: "center",
              background: "rgba(255,255,255,0.92)",
              color: COLORS.text,
              zIndex: 4,
              padding: 20,
              borderRadius: 18,
              border: `2px solid ${COLORS.accent}`,
              boxShadow: "0 2px 32px 0 rgba(0,0,0,0.12)",
              fontSize: 20,
              fontWeight: 600,
              outline: "2px solid #0002"
            }}>
              <div style={{fontSize: 30, color: COLORS.snake}}>Game Over</div>
              <div style={{margin: "12px 0", fontWeight: 400}}>Your score: <span style={{fontWeight: 700, color: COLORS.snakeHead}}>{score}</span></div>
              <button
                autoFocus
                aria-label="Restart game"
                style={{
                  background: COLORS.snakeHead,
                  color: COLORS.text,
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 18,
                  padding: "10px 26px",
                  cursor: "pointer",
                  boxShadow: "0 2px 12px #ccc",
                  marginTop: 10,
                  transition: "background 0.15s"
                }}
                onClick={startGame}
              >
                Restart
              </button>
            </div>
          )}
        </div>
        {/* Controls/instructions below */}
        {renderControls()}
      </main>
      {/* Footer with minimal copyright */}
      <footer style={{
        textAlign: "center",
        fontSize: 14,
        color: "#bbb",
        marginTop: "auto",
        marginBottom: 10,
      }}>
        <span>Modern Snake Game &copy; {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}

export default App;
