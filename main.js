let status = "title"
let mode = "marathon"

let game, input, config

let default_config = {
    das: 10,
    arr: 2,
    dcd: 2,
    sdf: 6,
    are: 8,
    line: 20,
    cancel_das: false,
    hard_block: false,
    prefer_soft: true,
    move_left: "ArrowLeft",
    move_right: "ArrowRight",
    soft_drop: "ArrowDown",
    hard_drop: "Space",
    spin_left: "KeyZ",
    spin_right: "KeyX",
    spin_180: "KeyA",
    hold: "KeyC",
    reset: "KeyR",
}

const saved_config = localStorage.getItem("zaktris_config")
if (saved_config) {
    try {
        config = JSON.parse(saved_config)
        if (config.prefer_soft === undefined) config.prefer_soft = true
        if (!Number.isInteger(config.das)) config.das = Math.ceil(config.das)
        if (!Number.isInteger(config.dcd)) config.das = Math.ceil(config.dcd)
    } catch {
        console.warn("Invalid config data, loaded defaults.")
        config = { ...default_config }
    }
} else config = { ...default_config }

function format_num(num) {
    let negative = false
    if (num < 0) {
        negative = true
        num *= -1
    }

    let output = num.toString()
    if (num >= 1000) {
        let digits = output.length
        for (let i = digits - 3; i > 0; i -= 3) {
            output = output.substr(0, i) + "," + output.substr(i)
        }
    }

    if (num >= 2 ** 53) {
        output = "Infinity"
    }
    if (negative) {
        output = "-" + output
    }

    return output
}

function format_time(time) {
    let seconds = time / 60
    let output = seconds.toFixed(2) + "s"

    if (seconds >= 60) {
        output = Math.floor(time / 3600) + ":"
        seconds = (time / 60) % 60
        if (seconds >= 10) output += seconds.toFixed(2)
        else output += "0" + seconds.toFixed(2)
    }

    if (time >= 2 ** 53) output = "A very long time"

    return output
}

for (let i = 0; i < 20; i++) {
    for (let j = 0; j < 10; j++) {
        let cell = document.createElement("DIV")
        if ((i + j) % 2 === 0) cell.className = "background_cell even"
        else cell.className = "background_cell odd"
        document.getElementById("game_grid").appendChild(cell)
    }
}

for (let i = 10; i < 30; i++) {
    for (let j = 0; j < 10; j++) {
        let cell = document.createElement("DIV")
        cell.style.left = j * 32 + "px"
        cell.style.top = i * 32 - 320 + "px"
        cell.id = "cell_r" + i + "c" + j
        cell.className = "cell"
        document.getElementById("cell_wrapper").appendChild(cell)
    }
}

for (let i = 0; i < 5; i++) {
    let next = document.createElement("DIV")
    next.id = "next" + i
    next.className = "next"
    document.getElementById("queue").appendChild(next)
}

function make_empty_highscores() {
    const score_empty = () =>
        Array.from({ length: 10 }, () => ({
            score: 0,
            lines: 0,
            level: 1,
            time: 0,
        }))
    const sprint_empty = () =>
        Array.from({ length: 10 }, () => ({ time: 2 ** 53, pieces: 0, pps: 0 }))
    const ultra_empty = () =>
        Array.from({ length: 10 }, () => ({
            score: 0,
            lines: 0,
            level: 1,
        }))

    return {
        marathon: score_empty(),
        endless: score_empty(),
        sprint: sprint_empty(),
        ultra: ultra_empty(),
    }
}

let highscores = make_empty_highscores()

const saved_highscores = localStorage.getItem("zaktris_highscores")
if (saved_highscores) {
    try {
        const parsed = JSON.parse(saved_highscores)

        if (Array.isArray(parsed)) {
            highscores.endless = parsed
        } else if (parsed && typeof parsed === "object") {
            highscores = { ...make_empty_highscores(), ...parsed }
        }
    } catch {
        console.warn("Invalid highscore data, loaded empty highscore tables.")
    }
}

let place = -1

const pieces = {
    i: {
        color: "#00cdea",
        rotations: [
            [
                [1, 0],
                [1, 1],
                [1, 2],
                [1, 3],
            ], //0
            [
                [0, 2],
                [1, 2],
                [2, 2],
                [3, 2],
            ], //R
            [
                [2, 0],
                [2, 1],
                [2, 2],
                [2, 3],
            ], //2
            [
                [0, 1],
                [1, 1],
                [2, 1],
                [3, 1],
            ], //L
        ],
    },
    o: {
        color: "#eacd00",
        rotations: [
            [
                [0, 1],
                [0, 2],
                [1, 1],
                [1, 2],
            ], //0
            [
                [0, 1],
                [0, 2],
                [1, 1],
                [1, 2],
            ], //R
            [
                [0, 1],
                [0, 2],
                [1, 1],
                [1, 2],
            ], //2
            [
                [0, 1],
                [0, 2],
                [1, 1],
                [1, 2],
            ], //L
        ],
    },
    t: {
        color: "#af00ea",
        rotations: [
            [
                [0, 1],
                [1, 0],
                [1, 1],
                [1, 2],
            ], //0
            [
                [0, 1],
                [1, 1],
                [1, 2],
                [2, 1],
            ], //R
            [
                [1, 0],
                [1, 1],
                [1, 2],
                [2, 1],
            ], //2
            [
                [0, 1],
                [1, 0],
                [1, 1],
                [2, 1],
            ], //L
        ],
    },
    j: {
        color: "#0058ea",
        rotations: [
            [
                [0, 0],
                [1, 0],
                [1, 1],
                [1, 2],
            ], //0
            [
                [0, 1],
                [0, 2],
                [1, 1],
                [2, 1],
            ], //R
            [
                [1, 0],
                [1, 1],
                [1, 2],
                [2, 2],
            ], //2
            [
                [0, 1],
                [1, 1],
                [2, 0],
                [2, 1],
            ], //L
        ],
    },
    l: {
        color: "#ea7500",
        rotations: [
            [
                [0, 2],
                [1, 0],
                [1, 1],
                [1, 2],
            ], //0
            [
                [0, 1],
                [1, 1],
                [2, 1],
                [2, 2],
            ], //R
            [
                [1, 0],
                [1, 1],
                [1, 2],
                [2, 0],
            ], //2
            [
                [0, 0],
                [0, 1],
                [1, 1],
                [2, 1],
            ], //L
        ],
    },
    s: {
        color: "#00ea3a",
        rotations: [
            [
                [0, 1],
                [0, 2],
                [1, 0],
                [1, 1],
            ], //0
            [
                [0, 1],
                [1, 1],
                [1, 2],
                [2, 2],
            ], //R
            [
                [1, 1],
                [1, 2],
                [2, 0],
                [2, 1],
            ], //2
            [
                [0, 0],
                [1, 0],
                [1, 1],
                [2, 1],
            ], //L
        ],
    },
    z: {
        color: "#ea001e",
        rotations: [
            [
                [0, 0],
                [0, 1],
                [1, 1],
                [1, 2],
            ], //0
            [
                [0, 2],
                [1, 1],
                [1, 2],
                [2, 1],
            ], //R
            [
                [1, 0],
                [1, 1],
                [2, 1],
                [2, 2],
            ], //2
            [
                [0, 1],
                [1, 0],
                [1, 1],
                [2, 0],
            ], //L
        ],
    },
}

const main_kicks = {
    "01": [
        [0, 0],
        [0, -1],
        [-1, -1],
        [2, 0],
        [2, -1],
    ], // 0->R
    "02": [
        [0, 0],
        [-1, 0],
        [-1, 1],
        [-1, -1],
        [0, 1],
        [0, -1],
    ], // 0->2
    "03": [
        [0, 0],
        [0, 1],
        [-1, 1],
        [2, 0],
        [2, 1],
    ], // 0->L
    10: [
        [0, 0],
        [0, 1],
        [1, 1],
        [-2, 0],
        [-2, 1],
    ], // R->0
    12: [
        [0, 0],
        [0, 1],
        [1, 1],
        [-2, 0],
        [-2, 1],
    ], // R->2
    13: [
        [0, 0],
        [0, 1],
        [-2, 1],
        [-1, 1],
        [-2, 0],
        [-1, 0],
    ], // R->L
    20: [
        [0, 0],
        [1, 0],
        [1, -1],
        [1, 1],
        [0, -1],
        [0, 1],
    ], // 2->0
    21: [
        [0, 0],
        [0, -1],
        [-1, -1],
        [2, 0],
        [2, -1],
    ], // 2->R
    23: [
        [0, 0],
        [0, 1],
        [-1, 1],
        [2, 0],
        [2, 1],
    ], // 2->L
    30: [
        [0, 0],
        [0, -1],
        [1, -1],
        [-2, 0],
        [-2, -1],
    ], // L->0
    31: [
        [0, 0],
        [0, -1],
        [-2, -1],
        [-1, -1],
        [-2, 0],
        [-1, 0],
    ], // L->R
    32: [
        [0, 0],
        [0, -1],
        [1, -1],
        [-2, 0],
        [-2, -1],
    ], // L->2
}

const i_kicks = {
    "01": [
        [0, 0],
        [0, -2],
        [0, 1],
        [1, -2],
        [-2, 1],
    ], // 0->R
    "02": [
        [0, 0],
        [0, -1],
        [0, -2],
        [0, 1],
        [0, 2],
        [-1, 0],
    ], // 0->2
    "03": [
        [0, 0],
        [0, -1],
        [0, 2],
        [-2, -1],
        [1, 2],
    ], // 0->L
    10: [
        [0, 0],
        [0, 2],
        [0, -1],
        [-1, 2],
        [2, -1],
    ], // R->0
    12: [
        [0, 0],
        [0, -1],
        [0, 2],
        [-2, -1],
        [1, 2],
    ], // R->2
    13: [
        [0, 0],
        [-1, 0],
        [-2, 0],
        [1, 0],
        [2, 0],
        [0, 1],
    ], // R->L
    20: [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, -1],
        [0, -2],
        [1, 0],
    ], // 2->0
    21: [
        [0, 0],
        [0, 1],
        [0, -2],
        [2, 1],
        [-1, -2],
    ], // 2->R
    23: [
        [0, 0],
        [0, 2],
        [0, -1],
        [-1, 2],
        [2, -1],
    ], // 2->L
    30: [
        [0, 0],
        [0, 1],
        [0, -2],
        [2, 1],
        [-1, -2],
    ], // L->0
    31: [
        [0, 0],
        [1, 0],
        [2, 0],
        [-1, 0],
        [-2, 0],
        [0, -1],
    ], // L->R
    32: [
        [0, 0],
        [0, -2],
        [0, 1],
        [1, -2],
        [-2, 1],
    ], // L->2
}

function new_bag() {
    const types = ["i", "o", "t", "j", "l", "s", "z"]
    const bag = [...types]

    for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[bag[i], bag[j]] = [bag[j], bag[i]]
    }

    for (let i = 0; i < bag.length; i++) {
        game.bag.push(bag[i])
    }
}

function active_cells(piece) {
    return pieces[piece.type].rotations[piece.rotation].map(([dr, dc]) => [
        piece.r + dr,
        piece.c + dc,
    ])
}

function ghost_cells(piece, grid) {
    const gr = drop_row(piece, grid)
    return pieces[piece.type].rotations[piece.rotation].map(([dr, dc]) => [
        gr + dr,
        piece.c + dc,
    ])
}

function validate(type, rotation, r, c, grid) {
    for (const [dr, dc] of pieces[type].rotations[rotation]) {
        const tr = r + dr
        const tc = c + dc

        if (tc < 0 || tc >= 10 || tr >= 30) return false
        if (grid[tr][tc]) return false
    }
    return true
}

function srs(piece, dir, grid) {
    const from = piece.rotation
    const to = (from + dir) % 4

    if (piece.type === "o") {
        piece.rotation = to
        return true
    }

    const table = piece.type === "i" ? i_kicks : main_kicks
    const kicks = table[`${from}${to}`]

    for (let i = 0; i < kicks.length; i++) {
        const [dr, dc] = kicks[i]
        if (validate(piece.type, to, piece.r + dr, piece.c + dc, grid)) {
            piece.rotation = to
            piece.r += dr
            piece.c += dc
            game.spun = true
            game.last_kick = dir !== 2 && i === kicks.length - 1
            if (
                validate(piece.type, piece.rotation, piece.r + 1, piece.c, grid)
            ) {
                game.ground = false
            } else {
                lock_reset()
            }
            das_cut()
            return true
        }
    }
    return false
}

function full_rows(grid) {
    const rows = []
    for (let i = 0; i < 30; i++) {
        if (grid[i].every(cell => cell)) rows.push(i)
    }
    return rows
}

function clear(grid, rows) {
    for (const r of rows) {
        for (let c = 0; c < 10; c++) {
            grid[r][c] = ""
        }
    }
}

function collapse(grid, rows) {
    const cleared = new Set(rows)
    const survivors = []
    for (let i = 0; i < 30; i++) {
        if (!cleared.has(i)) survivors.push(grid[i])
    }
    while (survivors.length < 30) {
        survivors.unshift(new Array(10).fill(""))
    }
    for (let i = 0; i < 30; i++) {
        grid[i] = survivors[i]
    }
}

function tspin_type(piece, grid) {
    if (piece.type !== "t" || !game.spun) return "none"

    const immobile =
        !validate(piece.type, piece.rotation, piece.r - 1, piece.c, grid) &&
        !validate(piece.type, piece.rotation, piece.r, piece.c - 1, grid) &&
        !validate(piece.type, piece.rotation, piece.r, piece.c + 1, grid)
    if (!immobile) return "none"

    const t_front = {
        0: [0, 1],
        1: [1, 3],
        2: [2, 3],
        3: [0, 2],
    }

    const cr = piece.r + 1,
        cc = piece.c + 1
    const corners = [
        [cr - 1, cc - 1],
        [cr - 1, cc + 1],
        [cr + 1, cc - 1],
        [cr + 1, cc + 1],
    ]
    const occ = corners.map(
        ([r, c]) => c < 0 || c >= 10 || r >= 30 || (r >= 0 && grid[r][c]),
    )

    const [f1, f2] = t_front[piece.rotation]
    const front_filled = (occ[f1] ? 1 : 0) + (occ[f2] ? 1 : 0)

    return front_filled === 2 ? "full" : "mini"
}

function add_score(rows, tspin, color) {
    game.combo++
    game.score_timer = 0

    document.getElementById("score_text").style.color = color
    document.getElementById("score_value").style.color = color
    document.getElementById("score_special").style.color = color

    if (tspin === "full") {
        switch (rows) {
            case 0:
                game.score += 400 * game.level
                document.getElementById("score_special").innerHTML = "&nbsp;"
                document.getElementById("score_text").innerHTML = "T-SPIN"
                document.getElementById("score_value").innerHTML =
                    "+" + format_num(400 * game.level)
                break
            case 1:
                game.b2b++
                document.getElementById("score_text").innerHTML = "SINGLE"
                if (game.b2b >= 2) {
                    game.score += 1200 * game.level
                    document.getElementById("score_special").innerHTML =
                        "B2B T-SPIN"
                    document.getElementById("score_value").innerHTML =
                        "+" + format_num(1200 * game.level)
                } else {
                    game.score += 800 * game.level
                    document.getElementById("score_special").innerHTML =
                        "T-SPIN"
                    document.getElementById("score_value").innerHTML =
                        "+" + format_num(800 * game.level)
                }
                break
            case 2:
                game.b2b++
                document.getElementById("score_text").innerHTML = "DOUBLE"
                if (game.b2b >= 2) {
                    game.score += 1800 * game.level
                    document.getElementById("score_special").innerHTML =
                        "B2B T-SPIN"
                    document.getElementById("score_value").innerHTML =
                        "+" + format_num(1800 * game.level)
                } else {
                    game.score += 1200 * game.level
                    document.getElementById("score_special").innerHTML =
                        "T-SPIN"
                    document.getElementById("score_value").innerHTML =
                        "+" + format_num(1200 * game.level)
                }
                break
            case 3:
                game.b2b++
                document.getElementById("score_text").innerHTML = "TRIPLE"
                if (game.b2b >= 2) {
                    game.score += 2400 * game.level
                    document.getElementById("score_special").innerHTML =
                        "B2B T-SPIN"
                    document.getElementById("score_value").innerHTML =
                        "+" + format_num(2400 * game.level)
                } else {
                    game.score += 1600 * game.level
                    document.getElementById("score_special").innerHTML =
                        "T-SPIN"
                    document.getElementById("score_value").innerHTML =
                        "+" + format_num(1600 * game.level)
                }
                break
        }
    } else if (tspin === "mini") {
        switch (rows) {
            case 0:
                game.score += 100 * game.level
                document.getElementById("score_special").innerHTML = "&nbsp;"
                document.getElementById("score_text").innerHTML = "MINI T-SPIN"
                document.getElementById("score_value").innerHTML =
                    "+" + format_num(100 * game.level)
                break
            case 1:
                game.b2b++
                document.getElementById("score_text").innerHTML = "SINGLE"
                if (game.b2b >= 2) {
                    game.score += 300 * game.level
                    document.getElementById("score_special").innerHTML =
                        "B2B MINI T-SPIN"
                    document.getElementById("score_value").innerHTML =
                        "+" + format_num(300 * game.level)
                } else {
                    game.score += 200 * game.level
                    document.getElementById("score_special").innerHTML =
                        "MINI T-SPIN"
                    document.getElementById("score_value").innerHTML =
                        "+" + format_num(200 * game.level)
                }
                break
            case 2:
                game.b2b++
                document.getElementById("score_text").innerHTML = "DOUBLE"
                if (game.b2b >= 2) {
                    game.score += 600 * game.level
                    document.getElementById("score_special").innerHTML =
                        "B2B MINI T-SPIN"
                    document.getElementById("score_value").innerHTML =
                        "+" + format_num(600 * game.level)
                } else {
                    game.score += 400 * game.level
                    document.getElementById("score_special").innerHTML =
                        "MINI T-SPIN"
                    document.getElementById("score_value").innerHTML =
                        "+" + format_num(400 * game.level)
                }
                break
        }
    } else {
        switch (rows) {
            case 1:
                if (game.pc) game.b2b++
                else game.b2b = 0
                document.getElementById("score_special").innerHTML = "&nbsp;"
                document.getElementById("score_text").innerHTML = "SINGLE"
                game.score += 100 * game.level
                document.getElementById("score_value").innerHTML =
                    "+" + format_num(100 * game.level)
                break
            case 2:
                if (game.pc) game.b2b++
                else game.b2b = 0
                document.getElementById("score_special").innerHTML = "&nbsp;"
                document.getElementById("score_text").innerHTML = "DOUBLE"
                game.score += 300 * game.level
                document.getElementById("score_value").innerHTML =
                    "+" + format_num(300 * game.level)
                break
            case 3:
                if (game.pc) game.b2b++
                else game.b2b = 0
                document.getElementById("score_special").innerHTML = "&nbsp;"
                document.getElementById("score_text").innerHTML = "TRIPLE"
                game.score += 500 * game.level
                document.getElementById("score_value").innerHTML =
                    "+" + format_num(500 * game.level)
                break
            case 4:
                game.b2b++
                document.getElementById("score_text").innerHTML = "QUAD"
                if (game.b2b >= 2) {
                    game.score += 1200 * game.level
                    document.getElementById("score_special").innerHTML = "B2B"
                    document.getElementById("score_value").innerHTML =
                        "+" + format_num(1200 * game.level)
                } else {
                    game.score += 800 * game.level
                    document.getElementById("score_special").innerHTML =
                        "&nbsp;"
                    document.getElementById("score_value").innerHTML =
                        "+" + format_num(800 * game.level)
                }
                break
        }
    }

    if (game.pc) {
        if (game.b2b >= 2) {
            game.score += 5250 * game.level
            document.getElementById("pc_special").innerHTML = "B2B"
            document.getElementById("pc_value").innerHTML =
                "+" + format_num(5250 * game.level)
        } else {
            game.score += 3500 * game.level
            document.getElementById("pc_special").innerHTML = ""
            document.getElementById("pc_value").innerHTML =
                "+" + format_num(3500 * game.level)
        }
    }

    if (game.combo >= 2) {
        game.score += (50 * game.combo - 50) * game.level
        document.getElementById("combo_text").innerHTML =
            game.combo - 1 + " COMBO"
        document.getElementById("combo_value").innerHTML =
            "+" + (50 * game.combo - 50) * game.level
    } else {
        document.getElementById("combo_text").innerHTML = "&nbsp;"
        document.getElementById("combo_value").innerHTML = "&nbsp;"
    }

    if (mode === "sprint") {
        document.getElementById("score_value").innerHTML = "&nbsp;"
        document.getElementById("combo_value").innerHTML = "&nbsp;"
        document.getElementById("pc_value").innerHTML = ""
    }
}

function spawn_next() {
    game.held = false
    game.ground = false
    game.spun = false
    game.lock_timer = 0
    game.lock_resets = 15
    das_cut()

    game.piece = {
        type: game.bag.shift(),
        rotation: 0,
        r: 8,
        c: 3,
    }
    if (game.bag.length <= 7) {
        new_bag()
    }
    for (let i = 0; i < 5; i++) {
        document.getElementById("next" + i).style.backgroundImage =
            `url(queue/${game.bag[i]}.png)`
    }

    if (game.ihs) {
        game.ihs = false
        let current_type = game.piece.type

        if (game.hold === null) {
            game.hold = current_type
            spawn_next()
            return
        } else {
            let held_type = game.hold
            game.hold = current_type
            game.piece = {
                type: held_type,
                rotation: 0,
                r: 8,
                c: 3,
            }
        }

        game.held = true
        document.getElementById("hold").style.backgroundImage =
            `url(hold/${game.hold}.png)`
    }

    if (game.irs) {
        if (
            validate(
                game.piece.type,
                game.irs,
                game.piece.r,
                game.piece.c,
                game.grid,
            )
        ) {
            game.piece.rotation = game.irs
        }
        game.irs = 0
    }

    if (
        !validate(
            game.piece.type,
            game.piece.rotation,
            game.piece.r,
            game.piece.c,
            game.grid,
        )
    ) {
        game.over = "fail"
        game.piece = null

        if (mode === "marathon" || mode === "endless") {
            let entry = {
                score: game.score,
                lines: game.lines,
                level: game.level,
                time: game.time,
                new: true,
            }

            highscores[mode].push(entry)
            highscores[mode].sort((a, b) => b.score - a.score)
            highscores[mode].length = 10

            place = highscores[mode].findIndex(e => e.new)
            if (place !== -1) {
                delete highscores[mode][place].new
                localStorage.setItem(
                    "zaktris_highscores",
                    JSON.stringify(highscores),
                )
            }
        }

        document.getElementById("end").style.display = "block"
        return
    }
}

function pc_check(grid) {
    for (let r = 0; r < 30; r++) {
        for (let c = 0; c < 10; c++) {
            if (grid[r][c]) return false
        }
    }
    return true
}

function lock(piece, grid) {
    let tspin = tspin_type(game.piece, game.grid)
    let color = pieces[game.piece.type].color

    for (const [r, c] of active_cells(piece)) {
        grid[r][c] = piece.type
    }

    game.pieces++
    game.piece = null
    game.rows = full_rows(grid)
    if (game.rows.length > 0) {
        clear(grid, game.rows)
        game.lines += game.rows.length
        game.pc = pc_check(grid)
        add_score(game.rows.length, tspin, color)
        switch (mode) {
            case "marathon":
                game.level = Math.min(Math.floor(game.lines / 10) + 1, 15)
                break
            case "endless":
                game.level = Math.floor(game.lines / 10) + 1
                break
            case "ultra":
                {
                    let i = 1
                    let cumulative = 0
                    let step = 3
                    while (true) {
                        cumulative += step
                        if (cumulative > game.lines) break

                        i++
                        step += i === 11 ? 3 : 2
                    }
                    game.level = i
                }
                break
        }

        if (mode === "marathon") {
            if (game.lines >= 150) {
                game.over = "win"
                game.piece = null

                let entry = {
                    score: game.score,
                    lines: game.lines,
                    level: game.level,
                    time: game.time,
                    new: true,
                }

                highscores.marathon.push(entry)
                highscores.marathon.sort((a, b) => b.score - a.score)
                highscores.marathon.length = 10

                place = highscores.marathon.findIndex(e => e.new)
                if (place !== -1) {
                    delete highscores.marathon[place].new
                    localStorage.setItem(
                        "zaktris_highscores",
                        JSON.stringify(highscores),
                    )
                }

                document.getElementById("end").style.display = "block"
            }
        } else if (mode === "sprint") {
            if (game.lines >= 40) {
                game.over = "win"
                game.piece = null

                let entry = {
                    time: game.time,
                    pieces: game.pieces,
                    pps: (game.pieces * 60) / game.time,
                    new: true,
                }

                highscores.sprint.push(entry)
                highscores.sprint.sort((a, b) => a.time - b.time)
                highscores.sprint.length = 10

                place = highscores.sprint.findIndex(e => e.new)
                if (place !== -1) {
                    delete highscores.sprint[place].new
                    localStorage.setItem(
                        "zaktris_highscores",
                        JSON.stringify(highscores),
                    )
                }

                document.getElementById("end").style.display = "block"
            }
        }

        game.action = "line"
        if (config.line === 0) {
            collapse(game.grid, game.rows)
            if (!game.over) spawn_next()
        } else {
            game.next_timer = config.line
        }
    } else {
        game.combo = 0
        if (tspin !== "none") {
            add_score(0, tspin, color)
        }
        game.action = "are"
        if (config.are === 0) {
            spawn_next()
        } else {
            game.next_timer = config.are
        }
    }
}

function drop_row(piece, grid) {
    let r = piece.r
    while (validate(piece.type, piece.rotation, r + 1, piece.c, grid)) r++
    return r
}

function lock_time() {
    if (game.level >= 21) {
        return Math.max(5, Math.round(30 * 0.5 ** ((game.level - 20) / 5)))
    } else {
        return 30
    }
}

function lock_reset() {
    if (game.ground && game.lock_resets > 0) {
        game.lock_timer = lock_time()
        game.lock_resets--
    }
}

function try_move(dc) {
    if (!game.piece) return false
    if (
        validate(
            game.piece.type,
            game.piece.rotation,
            game.piece.r,
            game.piece.c + dc,
            game.grid,
        )
    ) {
        game.piece.c += dc
        game.spun = false
        if (
            validate(
                game.piece.type,
                game.piece.rotation,
                game.piece.r + 1,
                game.piece.c,
                game.grid,
            )
        ) {
            game.ground = false
        } else {
            lock_reset()
        }
        return true
    }
    return false
}

function active_direction() {
    const l = input.left
    const r = input.right
    if (l && r) return input.last_dir
    if (l) return "left"
    if (r) return "right"
    return null
}

function process_movement() {
    let spr = (0.8 - (game.level - 1) * 0.007) ** (game.level - 1)
    if (
        input.soft_drop &&
        config.prefer_soft &&
        !game.ground &&
        (spr * 60) / config.sdf < config.arr
    )
        return
    const dir = active_direction()

    if (dir !== input.active_dir) {
        input.active_dir = dir
        if (dir) {
            if (config.cancel_das) {
                input.das_timer = 0
                input.repeating = 0
            }
            try_move(dir === "left" ? -1 : 1)
        } else {
            input.das_timer = 0
            input.repeating = 0
        }
        return
    }

    if (!dir) return

    input.das_timer++
    if (!input.repeating) {
        if (input.das_timer >= config.das) {
            input.repeating = true
            input.das_timer = 0
            try_move(dir === "left" ? -1 : 1)
        }
    } else {
        while (input.das_timer >= config.arr) {
            input.das_timer -= config.arr
            if (!try_move(dir === "left" ? -1 : 1)) break
        }
    }
}

function das_cut() {
    if (input.repeating) {
        input.repeating = false
        input.das_timer = Math.max(0, config.das - config.dcd)
    } else {
        input.das_timer = Math.min(input.das_timer, config.das - config.dcd)
    }
}

function tick() {
    if (status !== "game") return

    if (game.start_timer < 180) {
        game.start_timer++
        document.getElementById("countdown_text").innerHTML = Math.ceil(
            (180 - game.start_timer) / 60,
        )
        if (game.start_timer >= 180) {
            document.getElementById("countdown_panel").style.display = "none"
            spawn_next()
        }
        return
    }

    if (game.score_timer < 120) game.score_timer++
    if (game.score_timer > 60) {
        document.getElementById("score_panel").style.opacity =
            (120 - game.score_timer) / 60
        if (game.pc) {
            document.getElementById("pc_panel").style.opacity =
                (120 - game.score_timer) / 60
        } else {
            document.getElementById("pc_panel").style.opacity = 0
        }
    } else {
        document.getElementById("score_panel").style.opacity = 1
        if (game.pc) {
            document.getElementById("pc_panel").style.opacity = 1
        } else {
            document.getElementById("pc_panel").style.opacity = 0
        }
    }
    document.getElementById("score_text").style.letterSpacing =
        game.score_timer ** 0.5 * 2 + "px"
    document.getElementById("score_text").style.marginRight =
        32 - game.score_timer ** 0.5 * 2 + "px"
    document.getElementById("pc_text").style.letterSpacing =
        game.score_timer ** 0.5 + "px"
    document.getElementById("pc_text").style.marginRight =
        game.score_timer ** 0.5 * -1 + "px"

    if (game.over) {
        document.getElementById("pc_panel").style.opacity = 1
        document.getElementById("pc_text").style.letterSpacing = "normal"
        document.getElementById("pc_text").style.marginRight = "0px"
        document.getElementById("pc_special").innerHTML = ""
        document.getElementById("pc_value").innerHTML = ""
        if (game.over === "fail") {
            document.getElementById("pc_text").innerHTML = "GAME OVER"
            for (let i = 10; i < 30; i++) {
                for (let j = 0; j < 10; j++) {
                    if (game.grid[i][j]) {
                        let cell = document.getElementById(
                            "cell_r" + i + "c" + j,
                        )
                        cell.style.backgroundColor = "hsl(282, 16%, 50%)"
                    }
                }
            }
            return
        } else if (game.over === "win") {
            document.getElementById("pc_text").innerHTML = "FINISH!"
        }
    }

    if (!game.over) {
        game.time++
        if (mode === "ultra") {
            if (game.time >= 7200) {
                game.over = "win"

                let entry = {
                    score: game.score,
                    lines: game.lines,
                    level: game.level,
                    new: true,
                }

                highscores.ultra.push(entry)
                highscores.ultra.sort((a, b) => b.score - a.score)
                highscores.ultra.length = 10

                place = highscores.ultra.findIndex(e => e.new)
                if (place !== -1) {
                    delete highscores.ultra[place].new
                    localStorage.setItem(
                        "zaktris_highscores",
                        JSON.stringify(highscores),
                    )
                }

                document.getElementById("end").style.display = "block"
                return
            }
        }

        process_movement()

        if (input.spin !== 0) {
            if (game.piece) {
                srs(game.piece, input.spin, game.grid)
            } else {
                game.irs = input.spin
            }
            input.spin = 0
        }

        if (input.hard_drop) {
            input.hard_drop = false
            if (game.piece && !game.block_timer) {
                let start_r = game.piece.r
                game.piece.r = drop_row(game.piece, game.grid)
                let distance = game.piece.r - start_r
                game.score += 2 * distance
                if (distance > 0) game.spun = false
                lock(game.piece, game.grid)
                game.ground = false
                game.lock_timer = 0
                game.lock_resets = 15
            }
        }
        if (game.block_timer > 0) game.block_timer--

        if (input.hold) {
            input.hold = false
            if (game.piece && !game.held) {
                let current_type = game.piece.type

                if (game.hold === null) {
                    game.hold = current_type
                    spawn_next()
                } else {
                    let held_type = game.hold
                    game.hold = current_type
                    game.piece = {
                        type: held_type,
                        rotation: 0,
                        r: 8,
                        c: 3,
                    }
                }

                game.held = true
                document.getElementById("hold").style.backgroundImage =
                    `url(hold/${game.hold}.png)`
            } else if (!game.piece) {
                game.ihs = true
            }
        }

        if (game.next_timer > 0) {
            game.next_timer--

            if (game.next_timer === 0) {
                if (game.action === "line") collapse(game.grid, game.rows)
                spawn_next()
            }
        }

        if (game.piece) {
            let spr = (0.8 - (game.level - 1) * 0.007) ** (game.level - 1)
            if (input.soft_drop) {
                if (config.sdf === 41) game.gravity += Infinity
                else game.gravity += config.sdf / (spr * 60)
            } else game.gravity += 1 / (spr * 60)
            while (game.gravity >= 1) {
                game.gravity--
                if (
                    validate(
                        game.piece.type,
                        game.piece.rotation,
                        game.piece.r + 1,
                        game.piece.c,
                        game.grid,
                    )
                ) {
                    game.piece.r++
                    if (input.soft_drop) game.score++
                    game.spun = false
                    game.ground = false
                } else {
                    game.gravity = 0
                    if (!game.ground) {
                        game.ground = true
                        game.lock_timer = lock_time()
                    }
                    break
                }
            }

            if (game.ground) {
                game.lock_timer--
                if (game.lock_timer <= 0) {
                    lock(game.piece, game.grid)
                    if (config.hard_block) game.block_timer = 2
                }
            }
        }
    }

    if (game.over === "win") {
        if (game.next_timer > 0 && game.action === "line") {
            game.next_timer--

            if (game.next_timer === 0) {
                collapse(game.grid, game.rows)
            }
        }
    }

    const active = game.piece
        ? new Set(active_cells(game.piece).map(([r, c]) => `${r},${c}`))
        : new Set()

    const ghost = game.piece
        ? new Set(
              ghost_cells(game.piece, game.grid).map(([r, c]) => `${r},${c}`),
          )
        : new Set()

    for (let i = 10; i < 30; i++) {
        for (let j = 0; j < 10; j++) {
            let cell = document.getElementById("cell_r" + i + "c" + j)

            if (active.has(`${i},${j}`)) {
                cell.className = "cell filled"
                cell.style.backgroundColor = pieces[game.piece.type].color
            } else if (ghost.has(`${i},${j}`)) {
                cell.className = "cell ghost"
                cell.style.backgroundColor = pieces[game.piece.type].color
            } else if (game.grid[i][j]) {
                cell.className = "cell filled"
                cell.style.backgroundColor = pieces[game.grid[i][j]].color
            } else {
                cell.className = "cell"
            }
        }
    }

    switch (mode) {
        case "marathon":
            document.getElementById("level_text").innerHTML =
                'LEVEL <span class="number">' +
                format_num(game.level) +
                "</span>" +
                '<br>LINES <span class="number">' +
                format_num(game.lines) +
                " / 150</span>" +
                '<br>SCORE <span class="number">' +
                format_num(game.score) +
                "</span>" +
                '<br>TIME <span class="number">' +
                format_time(game.time) +
                "</span>"
            break
        case "endless":
            document.getElementById("level_text").innerHTML =
                'LEVEL <span class="number">' +
                format_num(game.level) +
                "</span>" +
                '<br>LINES <span class="number">' +
                format_num(game.lines) +
                "</span>" +
                '<br>SCORE <span class="number">' +
                format_num(game.score) +
                "</span>" +
                '<br>TIME <span class="number">' +
                format_time(game.time) +
                "</span>"
            break
        case "sprint":
            if (game.time > 0)
                document.getElementById("level_text").innerHTML =
                    'LINES <span class="number">' +
                    format_num(game.lines) +
                    " / 40</span>" +
                    '<br>TIME <span class="number">' +
                    format_time(game.time) +
                    "</span>" +
                    '<br>PIECES <span class="number">' +
                    format_num(game.pieces) +
                    "</span>" +
                    '<br>PPS <span class="number">' +
                    ((60 * game.pieces) / game.time).toFixed(2) +
                    "</span>"
            break
        case "ultra":
            document.getElementById("level_text").innerHTML =
                'LEVEL <span class="number">' +
                format_num(game.level) +
                "</span>" +
                '<br>LINES <span class="number">' +
                format_num(game.lines) +
                "</span>" +
                '<br>SCORE <span class="number">' +
                format_num(game.score) +
                "</span>" +
                '<br>TIME <span class="number">' +
                format_time(7200 - game.time) +
                "</span>"
            break
    }

    if (!game.over) {
        if (input.reset) {
            input.reset_timer++
            if (input.reset_timer >= 60) {
                init_game()
            }
        } else {
            input.reset_timer = 0
        }
    }
}

function init_game() {
    status = "game"

    game = {
        level: 1,
        pieces: 0,
        lines: 0,
        time: 0,
        over: "",

        score: 0,
        combo: 0,
        b2b: 0,
        score_timer: 0,

        piece: null,
        hold: null,
        held: false,
        spun: false,
        last_kick: false,
        bag: [],

        next_timer: 0,
        irs: 0,
        ihs: false,
        action: "are",
        rows: [],

        gravity: 0,
        ground: false,
        lock_timer: 0,
        lock_resets: 15,
        block_timer: 0,

        grid: new Array(30),

        start_timer: 0,
    }

    input = {
        left: false,
        right: false,
        spin: 0,
        soft_drop: false,
        hard_drop: false,
        hold: false,
        last_dir: null,
        active_dir: null,
        das_timer: 0,
        repeating: false,
        reset: false,
        reset_timer: 0,
    }

    for (let i = 0; i < 30; i++) {
        game.grid[i] = new Array(10).fill("")
    }

    for (let i = 10; i < 30; i++) {
        for (let j = 0; j < 10; j++) {
            let cell = document.getElementById("cell_r" + i + "c" + j)
            cell.className = "cell"
        }
    }

    document.getElementById("score_special").innerHTML = "&nbsp;"
    document.getElementById("score_text").innerHTML = "&nbsp;"
    document.getElementById("score_value").innerHTML = "&nbsp;"
    document.getElementById("combo_text").innerHTML = "&nbsp;"
    document.getElementById("combo_value").innerHTML = "&nbsp;"
    document.getElementById("pc_panel").style.opacity = 0

    switch (mode) {
        case "marathon":
            document.getElementById("level_text").innerHTML =
                'LEVEL <span class="number">1</span>' +
                '<br>LINES <span class="number">0 / 150</span>' +
                '<br>SCORE <span class="number">0</span>' +
                '<br>TIME <span class="number">0.00s</span>'
            break
        case "endless":
            document.getElementById("level_text").innerHTML =
                'LEVEL <span class="number">1</span>' +
                '<br>LINES <span class="number">0</span>' +
                '<br>SCORE <span class="number">0</span>' +
                '<br>TIME <span class="number">0.00s</span>'
            break
        case "sprint":
            document.getElementById("level_text").innerHTML =
                'LINES <span class="number">0 / 40</span>' +
                '<br>TIME <span class="number">0.00s</span>' +
                '<br>PIECES <span class="number">0</span>' +
                '<br>PPS <span class="number">0.00</span>'
            break
        case "ultra":
            document.getElementById("level_text").innerHTML =
                'LEVEL <span class="number">1</span>' +
                '<br>LINES <span class="number">0</span>' +
                '<br>SCORE <span class="number">0</span>' +
                '<br>TIME <span class="number">2:00.00</span>'
            break
    }

    document.getElementById("hold").style.backgroundImage = "none"

    new_bag()
    new_bag()
    for (let i = 0; i < 5; i++) {
        document.getElementById("next" + i).style.backgroundImage =
            `url(queue/${game.bag[i]}.png)`
    }

    document.getElementById("countdown_panel").style.display = "flex"
    document.getElementById("countdown_text").innerHTML = "3"

    document.getElementById("end").style.display = "none"
}

function load_controls(controls) {
    document.getElementById("arr").value = controls.arr
    document.getElementById("arr_frames").innerHTML = controls.arr
    document.getElementById("arr_ms").innerHTML = Math.round(
        (controls.arr * 1000) / 60,
    )

    document.getElementById("das").value = controls.das
    document.getElementById("das_frames").innerHTML = controls.das
    document.getElementById("das_ms").innerHTML = Math.round(
        (controls.das * 1000) / 60,
    )

    document.getElementById("dcd").value = controls.dcd
    document.getElementById("dcd_frames").innerHTML = controls.dcd
    document.getElementById("dcd_ms").innerHTML = Math.round(
        (controls.dcd * 1000) / 60,
    )

    document.getElementById("sdf").value = controls.sdf
    if (controls.sdf === 41) {
        document.getElementById("sdf_mult").innerHTML = ""
        document.getElementById("sdf_symbol").innerHTML = "Infinite"
    } else {
        document.getElementById("sdf_mult").innerHTML = controls.sdf
        document.getElementById("sdf_symbol").innerHTML = "X"
    }

    document.getElementById("are").value = controls.are
    document.getElementById("are_frames").innerHTML = controls.are
    document.getElementById("are_ms").innerHTML = Math.round(
        (controls.are * 1000) / 60,
    )

    document.getElementById("lcd").value = controls.line
    document.getElementById("lcd_frames").innerHTML = controls.line
    document.getElementById("lcd_ms").innerHTML = Math.round(
        (controls.line * 1000) / 60,
    )

    if (controls.cancel_das) {
        document.getElementById("cancel_das").innerHTML = "✓"
        document.getElementById("cancel_das").className =
            "option_checkbox checked"
    } else {
        document.getElementById("cancel_das").innerHTML = ""
        document.getElementById("cancel_das").className = "option_checkbox"
    }
    if (controls.hard_block) {
        document.getElementById("hard_block").innerHTML = "✓"
        document.getElementById("hard_block").className =
            "option_checkbox checked"
    } else {
        document.getElementById("hard_block").innerHTML = ""
        document.getElementById("hard_block").className = "option_checkbox"
    }
    if (controls.prefer_soft) {
        document.getElementById("prefer_soft").innerHTML = "✓"
        document.getElementById("prefer_soft").className =
            "option_checkbox checked"
    } else {
        document.getElementById("prefer_soft").innerHTML = ""
        document.getElementById("prefer_soft").className = "option_checkbox"
    }

    for (const action of bindable) {
        if (controls[action] === null)
            document.getElementById(action + "_keybind").innerHTML = "None"
        else
            document.getElementById(action + "_keybind").innerHTML =
                controls[action]
    }
}

let draft_config = null
function open_controls() {
    draft_config = { ...config }
    status = "controls"

    load_controls(draft_config)
}

function reset_controls() {
    draft_config = { ...default_config }

    load_controls(draft_config)
}

function save_controls() {
    config = { ...draft_config }
    localStorage.setItem("zaktris_config", JSON.stringify(config))
}

let rebinding = null
const bindable = [
    "move_left",
    "move_right",
    "soft_drop",
    "hard_drop",
    "spin_left",
    "spin_right",
    "spin_180",
    "hold",
    "reset",
]

function start_rebind(action) {
    rebinding = action
    status = "rebinding"
    document.getElementById(rebinding + "_keybind").innerHTML = "PRESS A KEY..."
}

function handle_rebind(code) {
    if (code === "Escape") {
        status = "controls"
        document.getElementById(rebinding + "_keybind").innerHTML =
            draft_config[rebinding]
        return
    }

    for (const action of bindable) {
        if (draft_config[action] === code && action !== rebinding) {
            draft_config[action] = null
            document.getElementById(action + "_keybind").innerHTML = "None"
        }
    }

    draft_config[rebinding] = code
    document.getElementById(rebinding + "_keybind").innerHTML = code
}

let tick_loop = window.setInterval(tick, 1000 / 60)

window.addEventListener("keydown", event => {
    event.preventDefault()
    if (status === "game") {
        switch (event.code) {
            case config.move_left:
                if (event.repeat || game.over) break
                if (!input.left) {
                    input.left = true
                    input.last_dir = "left"
                }
                break
            case config.move_right:
                if (event.repeat || game.over) break
                if (!input.right) {
                    input.right = true
                    input.last_dir = "right"
                }
                break
            case config.soft_drop:
                if (event.repeat || game.over) break
                if (!input.soft_drop) {
                    input.soft_drop = true
                }
                break
            case config.hard_drop:
                if (event.repeat || game.over) break
                if (!input.hard_drop) {
                    input.hard_drop = true
                }
                break
            case config.spin_left:
                if (event.repeat || game.over) break
                if (input.spin === 0) {
                    input.spin = 3
                }
                break
            case config.spin_right:
                if (event.repeat || game.over) break
                if (input.spin === 0) {
                    input.spin = 1
                }
                break
            case config.spin_180:
                if (event.repeat || game.over) break
                if (input.spin === 0) {
                    input.spin = 2
                }
                break
            case config.hold:
                if (event.repeat || game.over) break
                if (!input.hold) {
                    input.hold = true
                }
                break
            case config.reset:
                if (event.repeat || game.over) break
                if (!input.reset) {
                    input.reset = true
                }
                break
            case "Escape":
                if (event.repeat || game.over) break
                status = "paused"
                document.getElementById("paused_screen").style.display = "block"
                document.getElementById("game_screen").style.display = "none"
                break
        }
    } else if (status === "paused") {
        switch (event.code) {
            case "Escape":
                if (event.repeat) break
                status = "game"
                document.getElementById("game_screen").style.display = "flex"
                document.getElementById("paused_screen").style.display = "none"
                break
        }
    } else if (status === "end") {
        switch (event.code) {
            case "Escape":
                if (event.repeat) break
                status = "title"
                document.getElementById("title_screen").style.display = "block"
                document.getElementById("end_screen").style.display = "none"
                break
        }
    } else if (status === "controls") {
        switch (event.code) {
            case "Escape":
                if (event.repeat) break
                status = "title"
                document.getElementById("title_screen").style.display = "block"
                document.getElementById("controls_screen").style.display =
                    "none"
                break
        }
    } else if (status === "rebinding") {
        handle_rebind(event.code)
    } else if (status === "highscores") {
        switch (event.code) {
            case "Escape":
                if (event.repeat) break
                status = "title"
                document.getElementById("title_screen").style.display = "block"
                document.getElementById("highscores_screen").style.display =
                    "none"
                break
        }
    }
})

window.addEventListener("keyup", event => {
    if (status === "game") {
        switch (event.code) {
            case config.move_left:
                input.left = false
                break
            case config.move_right:
                input.right = false
                break
            case config.soft_drop:
                input.soft_drop = false
                break
            case config.reset:
                input.reset = false
                break
        }
    }
})

document.getElementById("resume").addEventListener("click", () => {
    status = "game"
    document.getElementById("game_screen").style.display = "flex"
    document.getElementById("paused_screen").style.display = "none"
})

document.getElementById("restart").addEventListener("click", () => {
    init_game()
    document.getElementById("game_screen").style.display = "flex"
    document.getElementById("paused_screen").style.display = "none"
})

document.getElementById("main_menu").addEventListener("click", () => {
    status = "title"
    document.getElementById("title_screen").style.display = "block"
    document.getElementById("paused_screen").style.display = "none"
})

document.getElementById("marathon").addEventListener("click", () => {
    mode = "marathon"
    init_game()
    document.getElementById("game_screen").style.display = "flex"
    document.getElementById("title_screen").style.display = "none"
})

document.getElementById("endless").addEventListener("click", () => {
    mode = "endless"
    init_game()
    document.getElementById("game_screen").style.display = "flex"
    document.getElementById("title_screen").style.display = "none"
})

document.getElementById("sprint").addEventListener("click", () => {
    mode = "sprint"
    init_game()
    document.getElementById("game_screen").style.display = "flex"
    document.getElementById("title_screen").style.display = "none"
})

document.getElementById("ultra").addEventListener("click", () => {
    mode = "ultra"
    init_game()
    document.getElementById("game_screen").style.display = "flex"
    document.getElementById("title_screen").style.display = "none"
})

document.getElementById("controls").addEventListener("click", () => {
    open_controls()
    document.getElementById("controls_screen").style.display = "block"
    document.getElementById("title_screen").style.display = "none"
})

document.getElementById("save").addEventListener("click", () => {
    save_controls()
    status = "title"
    document.getElementById("title_screen").style.display = "block"
    document.getElementById("controls_screen").style.display = "none"
})

document.getElementById("back").addEventListener("click", () => {
    status = "title"
    document.getElementById("title_screen").style.display = "block"
    document.getElementById("controls_screen").style.display = "none"
})

document.getElementById("reset").addEventListener("click", () => {
    reset_controls()
})

document.getElementById("arr").addEventListener("input", () => {
    draft_config.arr = Number(document.getElementById("arr").value)
    document.getElementById("arr_frames").innerHTML = draft_config.arr
    document.getElementById("arr_ms").innerHTML = Math.round(
        (draft_config.arr * 1000) / 60,
    )
})

document.getElementById("das").addEventListener("input", () => {
    draft_config.das = Number(document.getElementById("das").value)
    document.getElementById("das_frames").innerHTML = draft_config.das
    document.getElementById("das_ms").innerHTML = Math.round(
        (draft_config.das * 1000) / 60,
    )
})

document.getElementById("dcd").addEventListener("input", () => {
    draft_config.dcd = Number(document.getElementById("dcd").value)
    document.getElementById("dcd_frames").innerHTML = draft_config.dcd
    document.getElementById("dcd_ms").innerHTML = Math.round(
        (draft_config.dcd * 1000) / 60,
    )
})

document.getElementById("sdf").addEventListener("input", () => {
    draft_config.sdf = Number(document.getElementById("sdf").value)
    if (draft_config.sdf === 41) {
        document.getElementById("sdf_mult").innerHTML = ""
        document.getElementById("sdf_symbol").innerHTML = "Infinite"
    } else {
        document.getElementById("sdf_mult").innerHTML = draft_config.sdf
        document.getElementById("sdf_symbol").innerHTML = "X"
    }
})

document.getElementById("are").addEventListener("input", () => {
    draft_config.are = Number(document.getElementById("are").value)
    document.getElementById("are_frames").innerHTML = draft_config.are
    document.getElementById("are_ms").innerHTML = Math.round(
        (draft_config.are * 1000) / 60,
    )
})

document.getElementById("lcd").addEventListener("input", () => {
    draft_config.line = Number(document.getElementById("lcd").value)
    document.getElementById("lcd_frames").innerHTML = draft_config.line
    document.getElementById("lcd_ms").innerHTML = Math.round(
        (draft_config.line * 1000) / 60,
    )
})

document.getElementById("cancel_das").addEventListener("click", () => {
    if (draft_config.cancel_das) {
        draft_config.cancel_das = false
        document.getElementById("cancel_das").innerHTML = ""
        document.getElementById("cancel_das").className = "option_checkbox"
    } else {
        draft_config.cancel_das = true
        document.getElementById("cancel_das").innerHTML = "✓"
        document.getElementById("cancel_das").className =
            "option_checkbox checked"
    }
})

document.getElementById("hard_block").addEventListener("click", () => {
    if (draft_config.hard_block) {
        draft_config.hard_block = false
        document.getElementById("hard_block").innerHTML = ""
        document.getElementById("hard_block").className = "option_checkbox"
    } else {
        draft_config.hard_block = true
        document.getElementById("hard_block").innerHTML = "✓"
        document.getElementById("hard_block").className =
            "option_checkbox checked"
    }
})

document.getElementById("prefer_soft").addEventListener("click", () => {
    if (draft_config.prefer_soft) {
        draft_config.prefer_soft = false
        document.getElementById("prefer_soft").innerHTML = ""
        document.getElementById("prefer_soft").className = "option_checkbox"
    } else {
        draft_config.prefer_soft = true
        document.getElementById("prefer_soft").innerHTML = "✓"
        document.getElementById("prefer_soft").className =
            "option_checkbox checked"
    }
})

for (const action of bindable) {
    document
        .getElementById(action + "_keybind")
        .addEventListener("click", () => {
            start_rebind(action)
        })
}

function load_highscores(mode, place) {
    let output = ""
    if (mode === "sprint") {
        for (let i = 0; i < 10; i++) {
            if (highscores[mode][i].time >= 2 ** 53) {
                let str =
                    "<tr>" +
                    "<td>#" +
                    (i + 1) +
                    "</td>" +
                    "<td>-</td>" +
                    "<td>-</td>" +
                    "<td>-</td>" +
                    "</tr>"
                output += str
            } else if (place === i) {
                let str =
                    "<tr>" +
                    '<td class="place">#' +
                    (i + 1) +
                    "</td>" +
                    '<td class="place">' +
                    format_time(highscores[mode][i].time) +
                    "</td>" +
                    '<td class="place">' +
                    format_num(highscores[mode][i].pieces) +
                    "</td>" +
                    '<td class="place">' +
                    highscores[mode][i].pps.toFixed(2) +
                    "</td>" +
                    "</tr>"
                output += str
            } else {
                let str =
                    "<tr>" +
                    "<td>#" +
                    (i + 1) +
                    "</td>" +
                    "<td>" +
                    format_time(highscores[mode][i].time) +
                    "</td>" +
                    "<td>" +
                    format_num(highscores[mode][i].pieces) +
                    "</td>" +
                    "<td>" +
                    highscores[mode][i].pps.toFixed(2) +
                    "</td>" +
                    "</tr>"
                output += str
            }
        }
    } else if (mode === "ultra") {
        for (let i = 0; i < 10; i++) {
            if (
                highscores[mode][i].score === 0 &&
                highscores[mode][i].lines === 0
            ) {
                let str =
                    "<tr>" +
                    "<td>#" +
                    (i + 1) +
                    "</td>" +
                    "<td>-</td>" +
                    "<td>-</td>" +
                    "<td>-</td>" +
                    "</tr>"
                output += str
            } else if (place === i) {
                let str =
                    "<tr>" +
                    '<td class="place">#' +
                    (i + 1) +
                    "</td>" +
                    '<td class="place">' +
                    format_num(highscores[mode][i].score) +
                    "</td>" +
                    '<td class="place">' +
                    format_num(highscores[mode][i].lines) +
                    "</td>" +
                    '<td class="place">' +
                    format_num(highscores[mode][i].level) +
                    "</td>" +
                    "</tr>"
                output += str
            } else {
                let str =
                    "<tr>" +
                    "<td>#" +
                    (i + 1) +
                    "</td>" +
                    "<td>" +
                    format_num(highscores[mode][i].score) +
                    "</td>" +
                    "<td>" +
                    format_num(highscores[mode][i].lines) +
                    "</td>" +
                    "<td>" +
                    format_num(highscores[mode][i].level) +
                    "</td>" +
                    "</tr>"
                output += str
            }
        }
    } else {
        for (let i = 0; i < 10; i++) {
            if (highscores[mode][i].time === 0) {
                let str =
                    "<tr>" +
                    "<td>#" +
                    (i + 1) +
                    "</td>" +
                    "<td>-</td>" +
                    "<td>-</td>" +
                    "<td>-</td>" +
                    "<td>-</td>" +
                    "</tr>"
                output += str
            } else if (place === i) {
                let str =
                    "<tr>" +
                    '<td class="place">#' +
                    (i + 1) +
                    "</td>" +
                    '<td class="place">' +
                    format_num(highscores[mode][i].score) +
                    "</td>" +
                    '<td class="place">' +
                    format_num(highscores[mode][i].lines) +
                    "</td>" +
                    '<td class="place">' +
                    format_num(highscores[mode][i].level) +
                    "</td>" +
                    '<td class="place">' +
                    format_time(highscores[mode][i].time) +
                    "</td>" +
                    "</tr>"
                output += str
            } else {
                let str =
                    "<tr>" +
                    "<td>#" +
                    (i + 1) +
                    "</td>" +
                    "<td>" +
                    format_num(highscores[mode][i].score) +
                    "</td>" +
                    "<td>" +
                    format_num(highscores[mode][i].lines) +
                    "</td>" +
                    "<td>" +
                    format_num(highscores[mode][i].level) +
                    "</td>" +
                    "<td>" +
                    format_time(highscores[mode][i].time) +
                    "</td>" +
                    "</tr>"
                output += str
            }
        }
    }

    return output
}

document.getElementById("end").addEventListener("click", () => {
    status = "end"
    document.getElementById("end_screen").style.display = "block"
    document.getElementById("game_screen").style.display = "none"

    if (mode === "sprint") {
        document.getElementById("end_head").innerHTML =
            "<tr>" +
            "<td></td>" +
            "<td>TIME</td>" +
            "<td>PIECES</td>" +
            "<td>PPS</td>" +
            "</tr>"
    } else if (mode === "ultra") {
        document.getElementById("end_head").innerHTML =
            "<tr>" +
            "<td></td>" +
            "<td>SCORE</td>" +
            "<td>LINES</td>" +
            "<td>LEVEL</td>" +
            "</tr>"
    } else {
        document.getElementById("end_head").innerHTML =
            "<tr>" +
            "<td></td>" +
            "<td>SCORE</td>" +
            "<td>LINES</td>" +
            "<td>LEVEL</td>" +
            "<td>TIME</td>" +
            "</tr>"
    }

    document.getElementById("end_body").innerHTML = load_highscores(mode, place)
})

document.getElementById("new_game").addEventListener("click", () => {
    init_game()
    document.getElementById("game_screen").style.display = "flex"
    document.getElementById("end_screen").style.display = "none"
})

document.getElementById("main_menu2").addEventListener("click", () => {
    status = "title"
    document.getElementById("title_screen").style.display = "block"
    document.getElementById("end_screen").style.display = "none"
})

document.getElementById("highscores").addEventListener("click", () => {
    status = "highscores"
    mode = "marathon"
    document.getElementById("highscores_screen").style.display = "block"
    document.getElementById("title_screen").style.display = "none"
    document.getElementById("mode").innerHTML = "MARATHON"

    document.getElementById("highscores_body").innerHTML = load_highscores(mode)
})

document.getElementById("mode").addEventListener("click", () => {
    switch (mode) {
        case "marathon":
            mode = "endless"
            document.getElementById("mode").innerHTML = "ENDLESS"
            break
        case "endless":
            mode = "sprint"
            document.getElementById("mode").innerHTML = "SPRINT"
            break
        case "sprint":
            mode = "ultra"
            document.getElementById("mode").innerHTML = "ULTRA"
            break
        case "ultra":
            mode = "marathon"
            document.getElementById("mode").innerHTML = "MARATHON"
            break
    }

    if (mode === "sprint") {
        document.getElementById("highscores_head").innerHTML =
            "<tr>" +
            "<td></td>" +
            "<td>TIME</td>" +
            "<td>PIECES</td>" +
            "<td>PPS</td>" +
            "</tr>"
    } else if (mode === "ultra") {
        document.getElementById("highscores_head").innerHTML =
            "<tr>" +
            "<td></td>" +
            "<td>SCORE</td>" +
            "<td>LINES</td>" +
            "<td>LEVEL</td>" +
            "</tr>"
    } else {
        document.getElementById("highscores_head").innerHTML =
            "<tr>" +
            "<td></td>" +
            "<td>SCORE</td>" +
            "<td>LINES</td>" +
            "<td>LEVEL</td>" +
            "<td>TIME</td>" +
            "</tr>"
    }

    document.getElementById("highscores_body").innerHTML = load_highscores(mode)
})

document.getElementById("back2").addEventListener("click", () => {
    status = "title"
    document.getElementById("title_screen").style.display = "block"
    document.getElementById("highscores_screen").style.display = "none"
})
