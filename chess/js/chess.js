function gid(id) {
    return document.getElementById(id);
}

// Track en-passant availability: { pawn: indexOfPawnThatMovedTwo, target: squareIndexToCaptureOnto } or null
let enPassant = null;
// Track promotion: the square that needs promotion
let promotionSquare = null;
let promotionColor = null; // 'white' or 'black'

/********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
// UTILITY: get row (1-8) and col (1-8) from square index (1-64)
function getRow(idx) { return Math.floor((idx - 1) / 8) + 1; }
function getCol(idx) { return (idx - 1) % 8 + 1; }
function getIdx(row, col) { return (row - 1) * 8 + col; }

/********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
// Find the position of a king
function findKing(color) {
    // color = 'white' or 'black', king class = 'roiB' or 'roiN'
    let kingClass = color === 'white' ? 'roiB' : 'roiN';
    for (let i = 1; i <= 64; i++) {
        if (gid(i).classList.contains(kingClass)) return i;
    }
    return -1;
}

/********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
// Check if a square is attacked by a given side
// attackerColor: 'white' or 'black' — the side that might attack the square
function isSquareAttackedBy(squareIdx, attackerColor) {
    let suffix = attackerColor === 'white' ? 'B' : 'N';
    let row = getRow(squareIdx);
    let col = getCol(squareIdx);

    // --- Pawn attacks ---
    if (attackerColor === 'white') {
        // White pawns attack upward (row - 1)
        if (row > 1) {
            if (col > 1) { let id = getIdx(row - 1, col - 1); if (gid(id).classList.contains('pionB')) return true; }
            if (col < 8) { let id = getIdx(row - 1, col + 1); if (gid(id).classList.contains('pionB')) return true; }
        }
    } else {
        // Black pawns attack downward (row + 1)
        if (row < 8) {
            if (col > 1) { let id = getIdx(row + 1, col - 1); if (gid(id).classList.contains('pionN')) return true; }
            if (col < 8) { let id = getIdx(row + 1, col + 1); if (gid(id).classList.contains('pionN')) return true; }
        }
    }

    // --- Knight attacks ---
    let knightMoves = [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
    let knightClass = 'cavalier' + suffix;
    for (let [dr, dc] of knightMoves) {
        let nr = row + dr, nc = col + dc;
        if (nr >= 1 && nr <= 8 && nc >= 1 && nc <= 8) {
            if (gid(getIdx(nr, nc)).classList.contains(knightClass)) return true;
        }
    }

    // --- King attacks ---
    let kingClass = 'roi' + suffix;
    let kingMoves = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    for (let [dr, dc] of kingMoves) {
        let nr = row + dr, nc = col + dc;
        if (nr >= 1 && nr <= 8 && nc >= 1 && nc <= 8) {
            if (gid(getIdx(nr, nc)).classList.contains(kingClass)) return true;
        }
    }

    // --- Rook/Queen attacks (straight lines) ---
    let rookClass = 'tour' + suffix;
    let queenClass = 'dame' + suffix;
    let straightDirs = [[0,1],[0,-1],[1,0],[-1,0]];
    for (let [dr, dc] of straightDirs) {
        for (let i = 1; i < 8; i++) {
            let nr = row + dr * i, nc = col + dc * i;
            if (nr < 1 || nr > 8 || nc < 1 || nc > 8) break;
            let sq = gid(getIdx(nr, nc));
            if (sq.innerHTML !== pieces.vide) {
                if (sq.classList.contains(rookClass) || sq.classList.contains(queenClass)) return true;
                break; // blocked
            }
        }
    }

    // --- Bishop/Queen attacks (diagonals) ---
    let bishopClass = 'fou' + suffix;
    let diagDirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
    for (let [dr, dc] of diagDirs) {
        for (let i = 1; i < 8; i++) {
            let nr = row + dr * i, nc = col + dc * i;
            if (nr < 1 || nr > 8 || nc < 1 || nc > 8) break;
            let sq = gid(getIdx(nr, nc));
            if (sq.innerHTML !== pieces.vide) {
                if (sq.classList.contains(bishopClass) || sq.classList.contains(queenClass)) return true;
                break;
            }
        }
    }

    return false;
}

/********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
// Check if a side is in check
function isInCheck(color) {
    // color = 'white' or 'black' — the side we're checking if in check
    let kingPos = findKing(color);
    if (kingPos === -1) return false;
    let attackerColor = color === 'white' ? 'black' : 'white';
    return isSquareAttackedBy(kingPos, attackerColor);
}

/********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
// Simulate a move and check if it leaves the mover in check
// Returns true if the move is legal (doesn't leave own king in check)
function isMoveLegal(fromIdx, toIdx, moverColor) {
    // Save state
    let fromEl = gid(fromIdx);
    let toEl = gid(toIdx);
    let savedToHTML = toEl.innerHTML;
    let savedFromHTML = fromEl.innerHTML;
    let savedToClasses = [...toEl.classList];
    let savedFromClasses = [...fromEl.classList];

    // Also handle en-passant capture simulation
    let epCapturedEl = null;
    let savedEpHTML = '';
    let savedEpClasses = [];
    if (enPassant && toIdx === enPassant.target) {
        let pClass = moverColor === 'white' ? 'pionB' : 'pionN';
        if (fromEl.classList.contains(pClass)) {
            epCapturedEl = gid(enPassant.pawn);
            savedEpHTML = epCapturedEl.innerHTML;
            savedEpClasses = [...epCapturedEl.classList];
            epCapturedEl.innerHTML = pieces.vide;
            let removeColor = moverColor === 'white' ? 'black' : 'white';
            let removeSuffix = moverColor === 'white' ? 'N' : 'B';
            epCapturedEl.classList.remove(removeColor === 'black' ? 'black' : 'white');
            Array.from(epCapturedEl.classList).forEach(c => {
                if (c.endsWith(removeSuffix)) epCapturedEl.classList.remove(c);
            });
        }
    }

    // Do move
    let movingPieceClass = moverColor === 'white'
        ? Array.from(fromEl.classList).find(c => c.endsWith("B") && c !== 'blanc')
        : Array.from(fromEl.classList).find(c => c.endsWith("N") && c !== 'noir');
    let colorClass = moverColor === 'white' ? 'white' : 'black';

    toEl.innerHTML = fromEl.innerHTML;
    // Remove old piece classes from target
    let oppSuffix = moverColor === 'white' ? 'N' : 'B';
    Array.from(toEl.classList).forEach(c => {
        if (c.endsWith(oppSuffix) && c !== 'noir' && c !== 'blanc') toEl.classList.remove(c);
    });
    toEl.classList.remove(moverColor === 'white' ? 'black' : 'white');
    if (movingPieceClass) toEl.classList.add(movingPieceClass);
    toEl.classList.add(colorClass);

    fromEl.innerHTML = pieces.vide;
    if (movingPieceClass) fromEl.classList.remove(movingPieceClass);
    fromEl.classList.remove(colorClass);

    // Check
    let inCheck = isInCheck(moverColor);

    // Restore
    fromEl.innerHTML = savedFromHTML;
    toEl.innerHTML = savedToHTML;

    // Restore classes
    fromEl.className = '';
    savedFromClasses.forEach(c => fromEl.classList.add(c));
    toEl.className = '';
    savedToClasses.forEach(c => toEl.classList.add(c));

    if (epCapturedEl) {
        epCapturedEl.innerHTML = savedEpHTML;
        epCapturedEl.className = '';
        savedEpClasses.forEach(c => epCapturedEl.classList.add(c));
    }

    return !inCheck;
}

/********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
// Get all possible destination squares for a piece (without check validation)
function getRawMoves(idx, color) {
    let el = gid(idx);
    let moves = [];
    let row = getRow(idx);
    let col = getCol(idx);
    let suffix = color === 'white' ? 'B' : 'N';
    let oppSuffix = color === 'white' ? 'N' : 'B';

    if (el.classList.contains('pion' + suffix)) {
        let dir = color === 'white' ? -1 : 1; // white goes up (row-1), black goes down (row+1)
        let startRow = color === 'white' ? 7 : 2;
        // Forward 1
        let fwd = getIdx(row + dir, col);
        if (row + dir >= 1 && row + dir <= 8 && gid(fwd).innerHTML === pieces.vide) {
            moves.push(fwd);
            // Forward 2 from starting position
            if (row === startRow) {
                let fwd2 = getIdx(row + 2 * dir, col);
                if (gid(fwd2).innerHTML === pieces.vide) moves.push(fwd2);
            }
        }
        // Capture diag left
        if (col > 1 && row + dir >= 1 && row + dir <= 8) {
            let capL = getIdx(row + dir, col - 1);
            if ([...gid(capL).classList].some(c => c.endsWith(oppSuffix) && c !== 'noir' && c !== 'blanc')) moves.push(capL);
        }
        // Capture diag right
        if (col < 8 && row + dir >= 1 && row + dir <= 8) {
            let capR = getIdx(row + dir, col + 1);
            if ([...gid(capR).classList].some(c => c.endsWith(oppSuffix) && c !== 'noir' && c !== 'blanc')) moves.push(capR);
        }
        // En passant
        if (enPassant) {
            if (col > 1 && enPassant.target === getIdx(row + dir, col - 1)) moves.push(enPassant.target);
            if (col < 8 && enPassant.target === getIdx(row + dir, col + 1)) moves.push(enPassant.target);
        }
    }

    if (el.classList.contains('cavalier' + suffix)) {
        let knightMoves = [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
        for (let [dr, dc] of knightMoves) {
            let nr = row + dr, nc = col + dc;
            if (nr >= 1 && nr <= 8 && nc >= 1 && nc <= 8) {
                let nIdx = getIdx(nr, nc);
                let nEl = gid(nIdx);
                if (nEl.innerHTML === pieces.vide || [...nEl.classList].some(c => c.endsWith(oppSuffix) && c !== 'noir' && c !== 'blanc'))
                    moves.push(nIdx);
            }
        }
    }

    if (el.classList.contains('roi' + suffix)) {
        let kingMoves = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
        for (let [dr, dc] of kingMoves) {
            let nr = row + dr, nc = col + dc;
            if (nr >= 1 && nr <= 8 && nc >= 1 && nc <= 8) {
                let nIdx = getIdx(nr, nc);
                let nEl = gid(nIdx);
                if (nEl.innerHTML === pieces.vide || [...nEl.classList].some(c => c.endsWith(oppSuffix) && c !== 'noir' && c !== 'blanc'))
                    moves.push(nIdx);
            }
        }
    }

    // Sliding pieces: rook, bishop, queen
    let isTour = el.classList.contains('tour' + suffix);
    let isFou = el.classList.contains('fou' + suffix);
    let isDame = el.classList.contains('dame' + suffix);

    if (isTour || isDame) {
        let dirs = [[0,1],[0,-1],[1,0],[-1,0]];
        for (let [dr, dc] of dirs) {
            for (let i = 1; i < 8; i++) {
                let nr = row + dr * i, nc = col + dc * i;
                if (nr < 1 || nr > 8 || nc < 1 || nc > 8) break;
                let nIdx = getIdx(nr, nc);
                let nEl = gid(nIdx);
                if (nEl.innerHTML === pieces.vide) {
                    moves.push(nIdx);
                } else if ([...nEl.classList].some(c => c.endsWith(oppSuffix) && c !== 'noir' && c !== 'blanc')) {
                    moves.push(nIdx);
                    break;
                } else {
                    break;
                }
            }
        }
    }

    if (isFou || isDame) {
        let dirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
        for (let [dr, dc] of dirs) {
            for (let i = 1; i < 8; i++) {
                let nr = row + dr * i, nc = col + dc * i;
                if (nr < 1 || nr > 8 || nc < 1 || nc > 8) break;
                let nIdx = getIdx(nr, nc);
                let nEl = gid(nIdx);
                if (nEl.innerHTML === pieces.vide) {
                    moves.push(nIdx);
                } else if ([...nEl.classList].some(c => c.endsWith(oppSuffix) && c !== 'noir' && c !== 'blanc')) {
                    moves.push(nIdx);
                    break;
                } else {
                    break;
                }
            }
        }
    }

    return moves;
}

/********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
// Get legal moves for a piece (filters out moves that leave king in check)
function getLegalMoves(idx, color) {
    let raw = getRawMoves(idx, color);
    return raw.filter(to => isMoveLegal(idx, to, color));
}

/********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
// Check if a side has any legal moves
function hasLegalMoves(color) {
    let suffix = color === 'white' ? 'B' : 'N';
    let colorClass = color === 'white' ? 'white' : 'black';
    for (let i = 1; i <= 64; i++) {
        let el = gid(i);
        if (el.classList.contains(colorClass) && [...el.classList].some(c => c.endsWith(suffix) && c !== 'noir' && c !== 'blanc')) {
            if (getLegalMoves(i, color).length > 0) return true;
        }
    }
    return false;
}

/********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
// Check for checkmate or stalemate. Returns 'checkmate', 'stalemate', or null
function checkEndCondition(color) {
    if (!hasLegalMoves(color)) {
        if (isInCheck(color)) return 'checkmate';
        return 'stalemate';
    }
    return null;
}

/********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
// Promotion: show the popup with appropriate pieces
function showPromotion(squareIdx, color) {
    promotionSquare = squareIdx;
    promotionColor = color;
    let choicesDiv = gid('promoChoices');
    choicesDiv.innerHTML = '';
    let promoOptions;
    if (color === 'white') {
        promoOptions = [
            { symbol: '♕', pClass: 'dameB' },
            { symbol: '♖', pClass: 'tourB' },
            { symbol: '♗', pClass: 'fouB' },
            { symbol: '♘', pClass: 'cavalierB' }
        ];
    } else {
        promoOptions = [
            { symbol: '♛', pClass: 'dameN' },
            { symbol: '♜', pClass: 'tourN' },
            { symbol: '♝', pClass: 'fouN' },
            { symbol: '♞', pClass: 'cavalierN' }
        ];
    }
    promoOptions.forEach(opt => {
        let span = document.createElement('span');
        span.className = 'piece';
        span.textContent = opt.symbol;
        span.onclick = function () { selectPiece(opt.symbol, opt.pClass); };
        choicesDiv.appendChild(span);
    });
    gid('overlay').classList.remove('hide');
}

/********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
// Handle piece selection from promotion popup
function selectPiece(symbol, pClass) {
    let sq = gid(promotionSquare);
    let color = promotionColor;
    let colorClass = color === 'white' ? 'white' : 'black';
    let oldPawnClass = color === 'white' ? 'pionB' : 'pionN';

    // Remove pawn class, add new piece class
    sq.classList.remove(oldPawnClass);
    sq.classList.add(pClass);
    sq.innerHTML = symbol;

    gid('overlay').classList.add('hide');
    promotionSquare = null;
    promotionColor = null;

    // After promotion, check for check/checkmate on the opponent
    let oppColor = color === 'white' ? 'black' : 'white';
    let endCond = checkEndCondition(oppColor);
    if (endCond === 'checkmate') {
        let winner = color === 'white' ? 'Les blancs' : 'Les noirs';
        document.documentElement.classList.remove('no-scroll');
        highlightKingInCheck(oppColor);
        return alert(winner + ' ont gagné par échec et mat !');
    } else if (endCond === 'stalemate') {
        document.documentElement.classList.remove('no-scroll');
        return alert('Pat ! Match nul.');
    }

    if (isInCheck(oppColor)) {
        highlightKingInCheck(oppColor);
    }

    play();
}

/********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
// Highlight king in check
function highlightKingInCheck(color) {
    let kingPos = findKing(color);
    if (kingPos !== -1) {
        gid(kingPos).classList.add('in-check');
    }
}

function clearCheckHighlight() {
    for (let i = 1; i <= 64; i++) {
        gid(i).classList.remove('in-check');
    }
}

/********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/

function f2(x) {
    cases.forEach(function (x) { x.removeEventListener('click', handler1); })
    possibilityId.forEach((e) => {
        gid(e).removeEventListener('click', handler);
        gid(e).classList.remove('possibility');
    });

    let origin = parseInt(last.id);
    let dest = parseInt(x.id);

    // If this move is an en-passant capture
    if (enPassant && dest === enPassant.target && last.classList.contains('pionB')) {
        let captured = gid(enPassant.pawn);
        if (captured && captured.innerHTML !== pieces.vide) {
            captured.innerHTML = pieces.vide;
            captured.classList.remove('black', 'pionN');
            Array.from(captured.classList).forEach(c => {
                if (c.endsWith("N") && c !== 'noir') captured.classList.remove(c);
            });
        }
    }

    let classEndingWithB = Array.from(last.classList).find(c => c.endsWith("B") && c !== 'blanc');
    let wasPionB = last.classList.contains('pionB');

    x.innerHTML = pieces[classEndingWithB];
    x.classList.add(classEndingWithB, 'white');
    x.classList.remove('black');
    Array.from(x.classList).forEach(c => {
        if (c.endsWith("N") && c !== 'noir') x.classList.remove(c);
    });

    last.innerHTML = pieces.vide;
    last.classList.remove(classEndingWithB, 'white');
    cases.forEach(function (x) { x.removeEventListener('click', handler1) })
    clean();
    clearCheckHighlight();
    joueurActif = "joueurN";

    // En passant tracking
    if (wasPionB && dest === origin - 16) {
        enPassant = { pawn: dest, target: origin - 8 };
    } else {
        enPassant = null;
    }

    // Promotion: white pawn reaches ligne1 (row 1)
    if (x.classList.contains('pionB') && getRow(dest) === 1) {
        showPromotion(dest, 'white');
        return; // Wait for user choice
    }

    // Check for check/checkmate/stalemate
    let endCond = checkEndCondition('black');
    if (endCond === 'checkmate') {
        highlightKingInCheck('black');
        document.documentElement.classList.remove('no-scroll');
        return alert("Échec et mat ! Les blancs ont gagné !");
    } else if (endCond === 'stalemate') {
        document.documentElement.classList.remove('no-scroll');
        return alert("Pat ! Match nul.");
    }

    if (isInCheck('black')) {
        highlightKingInCheck('black');
    }

    play();
}
/********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/


function fB2(x) {
    cases.forEach(function (x) { x.removeEventListener('click', handlerB1); })
    possibilityId.forEach((e) => {
        gid(e).removeEventListener('click', handlerB);
        gid(e).classList.remove('possibility');
    });

    let origin = parseInt(last.id);
    let dest = parseInt(x.id);

    // If this move is an en-passant capture
    if (enPassant && dest === enPassant.target && last.classList.contains('pionN')) {
        let captured = gid(enPassant.pawn);
        if (captured && captured.innerHTML !== pieces.vide) {
            captured.innerHTML = pieces.vide;
            captured.classList.remove('white', 'pionB');
            Array.from(captured.classList).forEach(c => {
                if (c.endsWith("B") && c !== 'blanc') captured.classList.remove(c);
            });
        }
    }

    let classEndingWithN = Array.from(last.classList).find(c => c.endsWith("N") && c !== 'noir');
    let wasPionN = last.classList.contains('pionN');

    x.innerHTML = pieces[classEndingWithN];
    x.classList.add(classEndingWithN, 'black');
    x.classList.remove('white');
    Array.from(x.classList).forEach(c => {
        if (c.endsWith("B") && c !== 'blanc') x.classList.remove(c);
    });

    last.innerHTML = pieces.vide;
    last.classList.remove(classEndingWithN, 'black');
    cases.forEach(function (x) { x.removeEventListener('click', handlerB1) })
    clean();
    clearCheckHighlight();
    joueurActif = "joueurB";

    // En passant tracking
    if (wasPionN && dest === origin + 16) {
        enPassant = { pawn: dest, target: origin + 8 };
    } else {
        enPassant = null;
    }

    // Promotion: black pawn reaches ligne8 (row 8)
    if (x.classList.contains('pionN') && getRow(dest) === 8) {
        showPromotion(dest, 'black');
        return; // Wait for user choice
    }

    // Check for check/checkmate/stalemate
    let endCond = checkEndCondition('white');
    if (endCond === 'checkmate') {
        highlightKingInCheck('white');
        document.documentElement.classList.remove('no-scroll');
        return alert("Échec et mat ! Les noirs ont gagné !");
    } else if (endCond === 'stalemate') {
        document.documentElement.classList.remove('no-scroll');
        return alert("Pat ! Match nul.");
    }

    if (isInCheck('white')) {
        highlightKingInCheck('white');
    }

    play();
}
/********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/



function f1(el) {
    possibilityId.forEach((e) => {
        gid(e).removeEventListener('click', handler);
        gid(e).classList.remove('possibility');
    });
    possibilityId.length = 0;
    if (last) {
        last.classList.remove('selected');
    }
    el.classList.add('selected');
    last = el;

    let elint = parseInt(el.id);
    let legalMoves = getLegalMoves(elint, 'white');

    legalMoves.forEach(targetIdx => {
        gid(targetIdx).classList.add('possibility');
        possibilityId.push(targetIdx);
        gid(targetIdx).addEventListener('click', handler);
    });
}
/********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/


function fB1(el) {
    possibilityId.forEach((e) => {
        gid(e).removeEventListener('click', handlerB);
        gid(e).classList.remove('possibility');
    });
    possibilityId.length = 0;
    if (last) {
        last.classList.remove('selected');
    }
    el.classList.add('selected');
    last = el;

    let elint = parseInt(el.id);
    let legalMoves = getLegalMoves(elint, 'black');

    legalMoves.forEach(targetIdx => {
        gid(targetIdx).classList.add('possibility');
        possibilityId.push(targetIdx);
        gid(targetIdx).addEventListener('click', handlerB);
    });
}
/********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
function handler1(event) {
    let el = event.target; // `event.target` est l'élément cliqué
    console.log(el);

    f1(el);
}

/********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/

function handlerB1(event) {
    let el = event.target; // `event.target` est l'élément cliqué
    console.log(el);

    fB1(el);
}
/********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
function handlerB(event) {
    let e = event.target; // `event.target` est l'élément cliqué
    console.log(e);
    fB2(e);


}
/********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/



function handler(event) {
    let e = event.target; // `event.target` est l'élément cliqué
    console.log(e);
    f2(e);


}
/********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
function clean() {
    cases.forEach((el) => {
        el.classList.remove('selected');
        el.classList.remove('possibility');
        el.classList.remove('actif');
        el.classList.remove('inactif');
        el.classList.remove('in-check');
    });
}

/********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/

function play() {
    console.log("play");
    console.log(cases);
    possibilityId = [];
    if (joueurActif == "joueurB") {

        cases.forEach((el) => {
            if (el.classList.contains('white')) {
                el.classList.add('actif');
                console.log(el);
                el.addEventListener('click', handler1);

            } else if (el.classList.contains('blacky')) {

                el.classList.add('inactif');

            }
        });



    } else {
        cases.forEach((el) => {
            if (el.classList.contains('black')) {
                el.classList.add('actif');
                el.addEventListener('click', handlerB1);
            } else if (el.classList.contains('white')) {
                el.classList.add('inactif');


            }
        });


    }

}
/********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/

function initEchiquier() {
    pieces = {
        pionN: "♟",
        pionB: "♙",
        dameN: "♛",
        dameB: "♕",
        vide: "",
        fouB: "♗",
        fouN: "♝",
        cavalierB: "♘",
        cavalierN: "♞",
        tourB: "♖",
        tourN: "♜",
        roiB: "♔",
        roiN: "♚"
    };
    joueurActif = "joueurB";
    console.log(cases);
    cases.forEach((el) => {

        if (el.id <= 8) {
            el.classList.add('ligne1');

        } else if (el.id <= 16) {
            el.classList.add('ligne2');
            el.innerHTML = pieces.pionN;
            el.classList.add('black');
            el.classList.add('pionN');
        } else if (el.id <= 24) {
            el.classList.add('ligne3');
        } else if (el.id <= 32) {
            el.classList.add('ligne4');
        } else if (el.id <= 40) {
            el.classList.add('ligne5');
        } else if (el.id <= 48) {
            el.classList.add('ligne6');
        } else if (el.id <= 56) {
            el.classList.add('ligne7');
            el.innerHTML = pieces.pionB;
            el.classList.add('white');
            el.classList.add('pionB');
        } else if (el.id <= 64) {
            el.classList.add('ligne8');

        }
        if (el.id % 8 == 1) {
            el.classList.add('colonne1');
        } else if (el.id % 8 == 2) {
            el.classList.add('colonne2');
        } else if (el.id % 8 == 3) {
            el.classList.add('colonne3');
        } else if (el.id % 8 == 4) {
            el.classList.add('colonne4');
        } else if (el.id % 8 == 5) {
            el.classList.add('colonne5');
        } else if (el.id % 8 == 6) {
            el.classList.add('colonne6');
        } else if (el.id % 8 == 7) {
            el.classList.add('colonne7');
        } else if (el.id % 8 == 0) {
            el.classList.add('colonne8');

        }
        if ((el.classList.contains('ligne1') && el.id % 2 == 0) || el.classList.contains('ligne2') && el.id % 2 == 1 || el.classList.contains('ligne3') && el.id % 2 == 0 || el.classList.contains('ligne4') && el.id % 2 == 1 || el.classList.contains('ligne5') && el.id % 2 == 0 || el.classList.contains('ligne6') && el.id % 2 == 1 || el.classList.contains('ligne7') && el.id % 2 == 0 || el.classList.contains('ligne8') && el.id % 2 == 1) {
            el.classList.add('noir');

        } else {
            el.classList.add('blanc');
        }
    });
    cases.forEach((e) => {
        if ((e.classList.contains('colonne1') || e.classList.contains('colonne8')) && e.classList.contains('ligne1')) {
            e.innerHTML = pieces.tourN;
            e.classList.add('tourN');
            e.classList.add('black');
        } else if ((e.classList.contains('colonne2') || e.classList.contains('colonne7')) && e.classList.contains('ligne1')) {
            e.innerHTML = pieces.cavalierN;
            e.classList.add('cavalierN');
            e.classList.add('black');
        } else if ((e.classList.contains('colonne3') || e.classList.contains('colonne6')) && e.classList.contains('ligne1')) {
            e.innerHTML = pieces.fouN;
            e.classList.add('fouN');
            e.classList.add('black');
        } else if ((e.classList.contains('colonne4')) && e.classList.contains('ligne1')) {
            e.innerHTML = pieces.dameN;
            e.classList.add('dameN');
            e.classList.add('black');
            console.log(e.innerHTML);
        } else if ((e.classList.contains('colonne5')) && e.classList.contains('ligne1')) {
            e.innerHTML = pieces.roiN;
            e.classList.add('roiN');
            e.classList.add('black');
        }
    });
    cases.forEach((e) => {
        if ((e.classList.contains('colonne1') || e.classList.contains('colonne8')) && e.classList.contains('ligne8')) {
            e.innerHTML = pieces.tourB;
            e.classList.add('tourB');
            e.classList.add('white');
        } else if ((e.classList.contains('colonne2') || e.classList.contains('colonne7')) && e.classList.contains('ligne8')) {
            e.innerHTML = pieces.cavalierB;
            e.classList.add('cavalierB');
            e.classList.add('white');
        } else if ((e.classList.contains('colonne3') || e.classList.contains('colonne6')) && e.classList.contains('ligne8')) {
            e.innerHTML = pieces.fouB;
            e.classList.add('fouB');
            e.classList.add('white');
        } else if ((e.classList.contains('colonne4')) && e.classList.contains('ligne8')) {
            e.innerHTML = pieces.dameB;
            e.classList.add('dameB');
            e.classList.add('white');
            console.log(e.innerHTML);
        } else if ((e.classList.contains('colonne5')) && e.classList.contains('ligne8')) {
            e.classList.add('roiB');
            e.classList.add('white');
            e.innerHTML = pieces.roiB;
        }
    });



}
/********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/


function init() {
    document.getElementById("game").classList.remove("hide");

    cases = document.querySelectorAll('.case');
    last = cases[1];

    try {
        cases.forEach((el) => {
            clean();
            el.innerHTML = "";
            el.classList.remove('black', 'noir', 'blanc', 'possibility', 'selected', 'white', 'ligne1', 'ligne2', 'ligne3', 'ligne4', 'ligne5', 'ligne6', 'ligne7', 'ligne8', 'colonne1', 'colonne2', 'colonne3', 'colonne4', 'colonne5', 'colonne6', 'colonne7', 'colonne8', 'pionN', 'pionB', 'dameN', 'dameB', 'fouB', 'fouN', 'cavalierB', 'cavalierN', 'tourB', 'tourN', 'roiB', 'roiN', 'in-check');
            el.removeEventListener('click', handler);
            el.removeEventListener('click', handlerB);
            el.removeEventListener('click', handler1);
            el.removeEventListener('click', handlerB1);

        });    } catch (error) {
        console.log(error);
    }    initEchiquier();
    enPassant = null;

    joueur1 = 1;
    joueur2 = 0;    // Disable page scrolling while playing
    document.documentElement.classList.add('no-scroll');

    play();

}