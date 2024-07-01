/**
 * Inside this file you will use the classes and functions from rx.js
 * to add visuals to the svg element in index.html, animate them, and make them interactive.
 *
 * Study and complete the tasks in observable exercises first to get ideas.
 *
 * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
 *
 * You will be marked on your functional programming style
 * as well as the functionality that you implement.
 *
 * Document your code!
 */

import "./style.css";
import { fromEvent, interval, merge } from "rxjs";
import { map, filter, scan } from "rxjs/operators";

/** Constants */
const Viewport = {
  CANVAS_WIDTH: 200,
  CANVAS_HEIGHT: 400,
  PREVIEW_WIDTH: 160,
  PREVIEW_HEIGHT: 80,
} as const;

const Constants = {
  TICK_RATE_MS: 500,
  GRID_WIDTH: 10,
  GRID_HEIGHT: 20,
} as const;

const Block = {
  WIDTH: Viewport.CANVAS_WIDTH / Constants.GRID_WIDTH,
  HEIGHT: Viewport.CANVAS_HEIGHT / Constants.GRID_HEIGHT,
};

const TetrominoPatterns: {
  [key: string]: { shape: number[][]; color: string };
} = {
  L: {
    shape: [
      [0, 0, 0],
      [1, 1, 1],
      [1, 0, 0],
    ],
    color: "pink",
  },
  O: {
    shape: [
      [0, 0],
      [1, 1],
      [1, 1],
    ],
    color: "cyan",
  },
  I: {
    shape: [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
    ],
    color: "red",
  },
  S: {
    shape: [
      [0, 0, 0],
      [0, 1, 1],
      [1, 1, 0],
    ],
    color: "orange",
  },

  Z: {
    shape: [
      [0, 0, 0],
      [1, 1, 0],
      [0, 1, 1],
    ],
    color: "yellow",
  },
  T: {
    shape: [
      [0, 0, 0],
      [1, 1, 1],
      [0, 1, 0],
    ],
    color: "purple",
  },
  J: {
    shape: [
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 1],
    ],
    color: "forestgreen",
  },
};

/** User input */
type Key = "KeyS" | "KeyA" | "KeyD" | "KeyW";

/** Utility functions */
const initializeGrid = () =>
  Array(Constants.GRID_HEIGHT).fill(
    Array(Constants.GRID_WIDTH).fill({ value: 0, color: "black" })
  );

const randomBlock = () => {
  // use object.keys to get an array of the keys in the TetrominoPatterns object
  const randomKey =
    Object.keys(TetrominoPatterns)[
      Math.floor(Math.random() * Object.keys(TetrominoPatterns).length)
    ];
  const { shape, color } = TetrominoPatterns[randomKey];
  const startX = Math.floor(
    Math.random() * (Constants.GRID_WIDTH - shape[0].length)
  );

  return { shape, color, x: startX, y: -shape.length + 2 };
};

const rotateBlock = (block: Block): Block => {
  const newShape = block.shape[0].map((_, index) =>
    block.shape.map((row) => row[index]).reverse()
  );
  return { ...block, shape: newShape };
};

const setNewHighScore = (newScore: number) => {
  const currentHighScore = localStorage.getItem("highScore"); // use localStorage to get the current high score
  if (currentHighScore === null) {
    localStorage.setItem("highScore", `${newScore}`);
  } else {
    localStorage.setItem(
      "highScore",
      `${Math.max(newScore, parseInt(currentHighScore))}`
    );
  }
};

const calculateLevel = (score: number) => Math.floor(score / 40) + 1; // 40 scores = 1 level

const restartGame = (): State => {
  return {
    ...startState,
    // reassign the properties below so the tetrominos are not the same
    grid: initializeGrid(),
    currentTetromino: randomBlock(),
    nextTetromino: randomBlock(),
  };
};

const addObstacle = (grid: TetrominoCell[][]) => {
  const randomX = Math.floor(Math.random() * Constants.GRID_WIDTH);
  const middleYRange = Constants.GRID_HEIGHT * 0.4; // Use 40% of the grid's height
  const randomY =
    Math.floor(Math.random() * middleYRange) +
    Math.floor(Constants.GRID_HEIGHT * 0.3); // Make sure the block is not too close to the top
  grid[randomY][randomX] = {
    value: 1,
    color: "black",
  };
  return grid;
};

// Functions below are called in tick()
const clearRows = (state: State) => {
  const clearedRows = state.grid.reduce(
    (rows, row, xIndex) =>
      row.every((cell) => cell.value === 1) ? [...rows, xIndex] : rows,
    [] as number[]
  );

  if (clearedRows.length >= 1) {
    const emptyRows = Array(clearedRows.length)
      .fill(0)
      .map(() =>
        Array(Constants.GRID_WIDTH).fill({ value: 0, color: "black" })
      );

    const updatedGrid = state.grid
      .filter((_, xIndex) => !clearedRows.includes(xIndex))
      .map((row) => [...row]);

    const totalRowsCleared = clearedRows.length;
    const scoreGained = totalRowsCleared * 10;
    const updatedScore = state.score + scoreGained;

    return {
      ...state,
      grid: [...emptyRows, ...updatedGrid],
      currentTetromino: {
        ...state.currentTetromino,
        y: state.currentTetromino.y + totalRowsCleared,
      },
      score: updatedScore,
    };
  }
};

const levelUp = (state: State) => {
  const newLevel = calculateLevel(state.score);
  if (newLevel > state.level) {
    return {
      ...state,
      grid: addObstacle(state.grid),
      level: newLevel,
    };
  }
};

const collision = (state: State): boolean => {
  // Check if there is a collision
  return state.currentTetromino.shape.some((row, xIndex) =>
    row.some((cell, yIndex) => {
      if (cell === 1) {
        const nextX = state.currentTetromino.x + yIndex;
        const nextY = 1 + state.currentTetromino.y + xIndex;
        return (
          nextY >= 0 &&
          (nextY >= Constants.GRID_HEIGHT ||
            state.grid[nextY][nextX].value === 1 ||
            (state.currentTetromino.shape.length === 2 &&
              state.currentTetromino.y + xIndex === 0))
        );
      }
    })
  );
};

const handleCollision = (state: State): State => {
  // handle collision by adding the current tetromino to the grid
  const copyGrid = state.grid.map((row) => row.map((cell) => ({ ...cell })));

  state.currentTetromino.shape.forEach((row, xIndex) => {
    row.forEach((cell, yIndex) => {
      if (cell === 1) {
        // lock the collided tetromino in place
        const nextX = state.currentTetromino.x + yIndex;
        const nextY = state.currentTetromino.y + xIndex;
        copyGrid[nextY][nextX] = {
          value: 1,
          color: state.currentTetromino.color,
        };
      }
    });
  });

  if (state.gameOver) {
    return state;
  } else {
    const newTetromino = randomBlock();
    const centerX = Math.floor(
      Math.random() * (Constants.GRID_WIDTH - newTetromino.shape[0].length)
    );
    newTetromino.x = centerX;
    newTetromino.y = -newTetromino.shape.length;
    return {
      ...state,
      grid: copyGrid,
      currentTetromino: state.nextTetromino,
      nextTetromino: randomBlock(),
    };
  }
};

/** State processing */
type State = Readonly<{
  grid: TetrominoCell[][];
  score: number;
  level: number;
  currentTetromino: Block;
  nextTetromino: Block;
  gameOver: boolean;
}>;

type Block = {
  // Represents the blocks that are already in the grid
  shape: number[][];
  color: string;
  x: number;
  y: number;
};

type Tetromino = {
  //Represents the current Tetromino that is actively moving on the game grid
  shape: number[][];
  color: string;
  x: number;
  y: number;
};

type TetrominoCell = {
  value: number;
  color: string;
};

const startState = {
  gameOver: false,
  grid: initializeGrid(),
  score: 0,
  level: 1,
  currentTetromino: randomBlock(),
  nextTetromino: randomBlock(),
};

/**
 * Updates the state by proceeding with one time step.
 * In each tick, the following checks are performed:
 * 1. Check if the game has ended, update high score in localStorage if yes
 * 2. Check if any rows should be cleared
 * 3. Check if the level should be increased
 * 4. Check if there is a collision, add the current tetromino to the grid if there is
 * 5. If all the above checks are passed, move the current tetromino down by 1
 *
 * @param s Current state
 * @returns Updated state
 */
const tick = (state: State): State => {
  const hasCollision = collision(state);

  // Check if the game has ended
  if (hasCollision && state.currentTetromino.y === -1) {
    setNewHighScore(state.score);
    return { ...state, gameOver: true };
  }

  const newState = clearRows(state);
  if (newState) {
    return newState;
  }

  const levelUpState = levelUp(state);
  if (levelUpState) {
    return levelUpState;
  }

  if (hasCollision) {
    return handleCollision(state);
  }

  return {
    ...state,
    currentTetromino: {
      ...state.currentTetromino,
      y: state.currentTetromino.y + 1,
    },
  };
};

/** Rendering (side effects) */
/**
 * Displays a SVG element on the canvas. Brings to foreground.
 * @param elem SVG element to display
 */
const show = (elem: SVGGraphicsElement) => {
  elem.setAttribute("visibility", "visible");
  elem.parentNode!.appendChild(elem);
};

/**
 * Hides a SVG element on the canvas.
 * @param elem SVG element to hide
 */
const hide = (elem: SVGGraphicsElement) =>
  elem.setAttribute("visibility", "hidden");

/**
 * Creates an SVG element with the given properties.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element for valid
 * element names and properties.
 *
 * @param namespace Namespace of the SVG element
 * @param name SVGElement name
 * @param props Properties to set on the SVG element
 * @returns SVG element
 */
const createSvgElement = (
  namespace: string | null,
  name: string,
  props: Record<string, string> = {}
) => {
  const elem = document.createElementNS(namespace, name) as SVGElement;
  Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
  return elem;
};

/**
 * This is the function called on page load. Your main game loop
 * should be called here.
 */
export function main() {
  // Canvas elements
  const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement &
    HTMLElement;
  const preview = document.querySelector("#svgPreview") as SVGGraphicsElement &
    HTMLElement;
  const gameover = document.querySelector("#gameOver") as SVGGraphicsElement &
    HTMLElement;
  const container = document.querySelector("#main") as HTMLElement;

  svg.setAttribute("height", `${Viewport.CANVAS_HEIGHT}`);
  svg.setAttribute("width", `${Viewport.CANVAS_WIDTH}`);
  preview.setAttribute("height", `${Viewport.PREVIEW_HEIGHT}`);
  preview.setAttribute("width", `${Viewport.PREVIEW_WIDTH}`);

  // Text fields
  const levelText = document.querySelector("#levelText") as HTMLElement;
  const scoreText = document.querySelector("#scoreText") as HTMLElement;
  const highScoreText = document.querySelector("#highScoreText") as HTMLElement;

  const restartButton = document.querySelector("#restartButton") as HTMLElement;

  /** Observables: observable streams have $ behind its variable name to differentiate them */
  /** User input */
  const key$ = fromEvent<KeyboardEvent>(document, "keypress");
  const clickRestartButton$ = fromEvent(restartButton, "click");

  const fromKey = (keyCode: Key) =>
    key$.pipe(filter(({ code }) => code === keyCode));

  const left$ = fromKey("KeyA");
  const right$ = fromKey("KeyD");
  const down$ = fromKey("KeyS");
  const rotate$ = fromKey("KeyW");
  const restart$ = clickRestartButton$.pipe(map(() => () => restartGame()));

  /** Determines the rate of time steps */
  const tick$ = interval(Constants.TICK_RATE_MS);

  // Functions below are called in render()
  const renderBlock = (
    x: number,
    y: number,
    color: string,
    svg: SVGGraphicsElement & HTMLElement
  ) => {
    const block = createSvgElement(svg.namespaceURI, "rect", {
      height: `${Block.HEIGHT}`,
      width: `${Block.WIDTH}`,
      x: `${Block.WIDTH * x}`,
      y: `${Block.HEIGHT * y}`,
      style: `fill: ${color}`,
      class: "tetris-block", // add a class to identify the block to be removed later
    });
    svg.appendChild(block);
  };

  const showGrid = (
    grid: TetrominoCell[][],
    svg: SVGGraphicsElement & HTMLElement
  ) => {
    grid.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell.value) {
          renderBlock(x, y, cell.color, svg);
        }
      })
    );
  };

  const showTetromino = (
    tetromino: Tetromino,
    svg: SVGGraphicsElement & HTMLElement
  ) => {
    tetromino.shape.forEach((row: number[], xIndex: number) =>
      row.forEach((cell, yIndex) => {
        if (cell === 1) {
          renderBlock(
            tetromino.x + yIndex,
            tetromino.y + xIndex,
            tetromino.color,
            svg
          );
        }
      })
    );
  };

  const showPreview = (state: State) => {
    // Clear the previous preview blocks
    const previewBlocks = preview.querySelectorAll("rect");
    previewBlocks.forEach((block) => {
      preview.removeChild(block);
    });

    const { nextTetromino } = state;
    const blockWidth = Block.WIDTH;
    const blockHeight = Block.HEIGHT;
    const previewWidth = Viewport.PREVIEW_WIDTH;

    // To center the nextTetromino horizontally
    const centerX =
      (previewWidth - nextTetromino.shape[0].length * blockWidth) / 2;

    // Render nextTetromino
    nextTetromino.shape.forEach((row, xIndex) => {
      row.forEach((cell, yIndex) => {
        if (cell === 1) {
          const cube = createSvgElement(preview.namespaceURI, "rect", {
            height: `${blockHeight}`,
            width: `${blockWidth}`,
            x: `${centerX + yIndex * blockWidth}`,
            y: `${xIndex * blockHeight}`,
            style: `fill: ${nextTetromino.color}`,
          });
          preview.appendChild(cube);
        }
      });
    });
  };

  const showGameOver = (state: State) => {
    if (state.gameOver) {
      show(gameover);
    } else {
      hide(gameover);
    }
  };

  /**
   * Reference from FIT2102 Week 5 Supplementary Exercise (screen saver example)
   */
  const moveTetromino = (state: State, dx: number, dy: number): State => {
    if (!state.gameOver) {
      const hasCollision = state.currentTetromino.shape.some((row, xIndex) =>
        row.some((cell, yIndex) => {
          if (cell === 1) {
            const nextX = dx + state.currentTetromino.x + yIndex;
            const nextY = dy + state.currentTetromino.y + xIndex;
            return (
              // check collision
              nextY < 0 ||
              nextY >= Constants.GRID_HEIGHT ||
              nextX >= Constants.GRID_WIDTH ||
              nextX < 0 ||
              state.grid[nextY][nextX].value === 1
            );
          }
        })
      );

      if (hasCollision) {
        return state;
      }

      return {
        ...state,
        currentTetromino: {
          ...state.currentTetromino,
          x: dx + state.currentTetromino.x,
          y: dy + state.currentTetromino.y,
        },
      };
    }
    return state;
  };

  const rotateTetromino = (state: State): State => {
    if (!state.gameOver) {
      const rotatedTetromino = rotateBlock(state.currentTetromino); // calculates the rotated version of the current tetromino

      const hasCollision = rotatedTetromino.shape.some((row, xIndex) =>
        row.some((cell, yIndex) => {
          if (cell === 1) {
            const nextX = yIndex + rotatedTetromino.x;
            const nextY = xIndex + rotatedTetromino.y;
            return (
              nextY < 0 ||
              nextY >= Constants.GRID_HEIGHT ||
              nextX >= Constants.GRID_WIDTH ||
              nextX < 0 ||
              state.grid[nextY][nextX].value === 1
            );
          }
        })
      );

      if (hasCollision) {
        return state;
      }
      return { ...state, currentTetromino: rotatedTetromino };
    }
    return state;
  };

  /**
   * Renders the current state to the canvas.
   *
   * In MVC terms, this updates the View using the Model.
   *
   * @param s Current state
   */
  const render = (state: State) => {
    // Clear the existing tetris blocks
    const tetrisBlocks = svg.querySelectorAll(".tetris-block");
    tetrisBlocks.forEach((block) => {
      svg.removeChild(block);
    });

    showGrid(state.grid, svg);
    showTetromino(state.currentTetromino, svg);
    showPreview(state);
    scoreText.textContent = `${state.score}`;
    setNewHighScore(state.score);
    highScoreText.textContent = `${localStorage.getItem("highScore") || 0}`;
    levelText.textContent = `${state.level}`;
    showGameOver(state);
  };

  /** Subscribe to the observables */
  const source$ = merge(
    restart$,
    tick$.pipe(
      map(() => (currentState: State) => {
        const newState = tick(currentState);
        return newState;
      })
    ),
    left$.pipe(map(() => (state: State) => moveTetromino(state, -1, 0))),
    right$.pipe(map(() => (state: State) => moveTetromino(state, 1, 0))),
    down$.pipe(map(() => (state: State) => moveTetromino(state, 0, 1))),
    rotate$.pipe(map(() => (state: State) => rotateTetromino(state)))
  )
    .pipe(
      scan((state: State, f: (state: State) => State) => {
        const newState = f(state);
        return newState;
      }, startState)
    )
    .subscribe((state: State) => {
      render(state);
    });
}

// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== "undefined") {
  window.onload = () => {
    main();
  };
}
