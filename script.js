
const grid = document.getElementById("sudoku-grid");
const status = document.getElementById("status");

const example = [
    [5,3,0,0,7,0,0,0,0],
    [6,0,0,1,9,5,0,0,0],
    [0,9,8,0,0,0,0,6,0],
    [8,0,0,0,6,0,0,0,3],
    [4,0,0,8,0,3,0,0,1],
    [7,0,0,0,2,0,0,0,6],
    [0,6,0,0,0,0,2,8,0],
    [0,0,0,4,1,9,0,0,5],
    [0,0,0,0,8,0,0,7,9]
];

// Create 81 input cells.
function createGrid() {
    grid.innerHTML = "";

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const input = document.createElement("input");

            input.type = "text";
            input.inputMode = "numeric";
            input.maxLength = 1;
            input.className = "cell";
            input.dataset.row = r;
            input.dataset.col = c;
            input.setAttribute(
                "aria-label",
                `Row ${r + 1}, Column ${c + 1}`
            );

            input.addEventListener("input", () => {
                input.value = input.value.replace(/[^1-9]/g, "");
                input.classList.remove("given", "solved", "invalid");
                setStatus("Puzzle updated. Click Solve Puzzle.");
            });

            grid.appendChild(input);
        }
    }
}

function readGrid() {
    const board = Array.from(
        { length: 9 },
        () => Array(9).fill(0)
    );

    [...grid.children].forEach(input => {
        const r = Number(input.dataset.row);
        const c = Number(input.dataset.col);
        board[r][c] = Number(input.value) || 0;
    });

    return board;
}

function displayGrid(board, original = null) {
    [...grid.children].forEach(input => {
        const r = Number(input.dataset.row);
        const c = Number(input.dataset.col);

        input.value = board[r][c] || "";
        input.classList.remove("given", "solved", "invalid");

        if (board[r][c] !== 0) {
            if (original && original[r][c] !== 0) {
                input.classList.add("given");
            } else {
                input.classList.add("solved");
            }
        }
    });
}

function setStatus(message, type = "") {
    status.textContent = message;
    status.className = type;
}

// Return valid candidate values for an empty cell.
// This enforces row, column and 3x3 box constraints.
function candidates(board, row, col) {
    const used = new Set();

    for (let i = 0; i < 9; i++) {
        used.add(board[row][i]);
        used.add(board[i][col]);
    }

    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;

    for (let r = startRow; r < startRow + 3; r++) {
        for (let c = startCol; c < startCol + 3; c++) {
            used.add(board[r][c]);
        }
    }

    const result = [];

    for (let n = 1; n <= 9; n++) {
        if (!used.has(n)) result.push(n);
    }

    return result;
}

// Detect conflicting numbers in the starting puzzle.
function hasConflicts(board) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const value = board[r][c];

            if (value === 0) continue;

            board[r][c] = 0;
            const valid = candidates(board, r, c).includes(value);
            board[r][c] = value;

            if (!valid) return true;
        }
    }

    return false;
}

// CSP backtracking with the Minimum Remaining Values heuristic.
function solveCSP(board, stats) {
    let bestCell = null;
    let bestCandidates = null;

    // MRV: choose the empty cell with the fewest candidates.
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] !== 0) continue;

            const options = candidates(board, r, c);

            if (options.length === 0) return false;

            if (
                bestCandidates === null ||
                options.length < bestCandidates.length
            ) {
                bestCell = [r, c];
                bestCandidates = options;
            }

            if (options.length === 1) break;
        }

        if (bestCandidates?.length === 1) break;
    }

    // No empty cells means the puzzle is solved.
    if (bestCell === null) return true;

    const [row, col] = bestCell;

    for (const value of bestCandidates) {
        stats.nodes++;
        board[row][col] = value;

        if (solveCSP(board, stats)) {
            return true;
        }

        // Undo the choice when it leads to a dead end.
        board[row][col] = 0;
        stats.backtracks++;
    }

    return false;
}

function isSolved(board) {
    const expected = "123456789";

    for (let i = 0; i < 9; i++) {
        if ([...board[i]].sort().join("") !== expected) {
            return false;
        }

        const column = board.map(row => row[i]).sort().join("");

        if (column !== expected) return false;
    }

    for (let br = 0; br < 9; br += 3) {
        for (let bc = 0; bc < 9; bc += 3) {
            const box = [];

            for (let r = br; r < br + 3; r++) {
                for (let c = bc; c < bc + 3; c++) {
                    box.push(board[r][c]);
                }
            }

            if (box.sort().join("") !== expected) return false;
        }
    }

    return true;
}

document.getElementById("solve-btn").addEventListener("click", () => {
    const board = readGrid();
    const original = board.map(row => row.slice());

    if (hasConflicts(board)) {
        setStatus(
            "Invalid puzzle: repeated number in a row, column, or box.",
            "error"
        );

        [...grid.children].forEach(input => {
            input.classList.add("invalid");
        });

        return;
    }

    const stats = { nodes: 0, backtracks: 0 };
    const start = performance.now();

    const solved = solveCSP(board, stats);
    const elapsed = performance.now() - start;

    if (!solved || !isSolved(board)) {
        setStatus(
            `No solution found. Search nodes: ${stats.nodes}.`,
            "error"
        );
        return;
    }

    displayGrid(board, original);

    setStatus(
        `Solved in ${elapsed.toFixed(2)} ms | ` +
        `Search nodes: ${stats.nodes} | ` +
        `Backtracks: ${stats.backtracks}`,
        "success"
    );
});

document.getElementById("example-btn").addEventListener("click", () => {
    displayGrid(example);
    setStatus("Example puzzle loaded. Click Solve Puzzle.");
});

document.getElementById("clear-btn").addEventListener("click", () => {
    displayGrid(Array.from({ length: 9 }, () => Array(9).fill(0)));
    setStatus("Grid cleared. Enter your Sudoku puzzle.");
});

// Start the website with a sample puzzle.
createGrid();
displayGrid(example);
