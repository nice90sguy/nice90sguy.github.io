"use strict";
Object.defineProperty(Array.prototype, 'randomElement', {
    value: function () {
        return this.length ? this[Math.floor(Math.random() * this.length)] : undefined;
    }
});
Object.defineProperty(Array.prototype, 'shuffle', {
    value: function () {
        // Knuth shuffle https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
        for (let i = this.length; i > 0;) {
            const j = Math.floor(Math.random() * i);
            --i;
            const tmp = this[i];
            this[i] = this[j];
            this[j] = tmp;
        }
        return this;
    }
});
let addMorePairs = true;
const gameNum = 0;
const games = [
    { r: 4, c: 4, l: 2 },
    { r: 6, c: 6, l: 5 },
    { r: 10, c: 10, l: 10 }
];
let timerHandle = undefined;
// Hack
let blockClick = false;
function makeGame(rows, cols, numPairs, pairsPerTimeout = 2, timeoutMs = 3000) {
    const grid_len = rows * cols;
    // create a grid
    const grid = new Array(grid_len).fill(0);
    const i2rc = (i) => [Math.floor(i / rows), i % rows];
    const getGridIndexWithFewestTiles = () => {
        const p = [];
        for (let i = 0; i < grid_len; ++i)
            p.push({ i: i, h: grid[i] });
        p.sort((a, b) => a.h - b.h);
        let h = p[0].h;
        const lp = [];
        lp.push(p[0].i);
        for (let j = 1; j < grid_len; ++j)
            if (p[j].h > h)
                break;
            else {
                lp.push(p[j].i);
            }
        // @ts-ignore
        return lp.shuffle()[0];
    };
    const makeTileAtIndex = (i) => {
        // Images must always be unique
        if (emoji_idx > emojis.length - 1)
            return;
        const sz = 120;
        const fsz = 64;
        const h = grid[i];
        const v = emojis[emoji_idx];
        // https://stackoverflow.com/questions/48419167/how-to-convert-one-emoji-character-to-unicode-codepoint-number-in-javascript
        // @ts-ignore
        console.log([...v].map(e => e.codePointAt(0).toString(16)).join(`-`)); // gives correctly 1f469-200d-2695-fe0
        const cellElement = document.createElement('div');
        const [r, c] = i2rc(i);
        ++grid[i];
        cellElement.classList.add('tile');
        cellElement.style.zIndex = `${1000 + h}`;
        cellElement.id = `${i2rc(i)}-${h}`;
        cellElement.innerHTML = `<img src="imgs/${v}.png" width=${sz} height=${sz}>`;
        cellElement.style.left = c * sz + "px";
        cellElement.style.top = r * sz + "px";
        cellElement.style.width = sz + "px";
        cellElement.style.height = sz + "px";
        cellElement.style.fontSize = fsz + "pt";
        cellElement.style.animation = "fade-in .2s, move-in .3s, grow .3s";
        deckElement.appendChild(cellElement);
        cellElement.ontransitionend = () => {
            if (cellElement.classList.contains('rotateOut')) {
                cellElement.remove();
                --grid[i];
            }
            else
                cellElement.classList.remove("rotateBack");
        };
        cellElement.addEventListener('click', () => {
            if (blockClick)
                return;
            if (elToMatch === undefined) {
                cellElement.classList.add("selected");
                elToMatch = cellElement;
            }
            else if ((cellElement.firstElementChild).src === (elToMatch.firstElementChild).src && cellElement !== elToMatch) {
                score -= 1;
                audioEl.pause();
                audioEl.currentTime = 0;
                audioEl.play();
                clearInterval(timerHandle);
                if (addMorePairs)
                    timerHandle = setInterval(() => {
                        blockClick = true;
                        for (let np = 0; np < pairsPerTimeout; ++np)
                            dealPair();
                        blockClick = false;
                    }, timeoutMs);
                scoreEl.innerHTML = score.toFixed(0);
                elToMatch.classList.add('rotateOut');
                cellElement.classList.add('rotateOut');
                elToMatch = undefined;
            }
            else {
                cellElement.classList.add("rotateBack");
                elToMatch.classList.add("rotateBack");
                elToMatch.classList.remove("selected");
                elToMatch = undefined;
            }
        });
        return;
    };
    const dealPair = () => {
        const firstTileIdx = getGridIndexWithFewestTiles();
        let secondTileIndex = 0; // Value is irrelevant, gets set in do loop
        // Add a tile at lowest pile
        makeTileAtIndex(firstTileIdx);
        // Add a matching tile anywhere except on the same grid location as the first tile
        do {
            secondTileIndex = Math.floor(Math.random() * grid_len);
        } while (secondTileIndex === firstTileIdx);
        makeTileAtIndex(secondTileIndex);
        ++emoji_idx;
        ++score;
        scoreEl.innerHTML = score.toFixed(0);
    };
    const deal = () => {
        // Make the background
        // for (let i = 0; i < grid_len; ++i)
        //     makeTileAtIndex(i, true);
        let pair = 0;
        const to = setInterval(() => {
            if (pair++ < numPairs)
                dealPair();
            else
                clearInterval(to);
        }, 100);
        // for (let pair = 0; pair < numPairs; ++pair)
        //     dealPair();
    };
    // @ts-ignore
    // const emojis = allEmojis.slice(0,100).shuffle()
    // const emojis = allEmojis.shuffle()
    const emojis = emojiImgs.shuffle();
    let emoji_idx = 0;
    let score = 0;
    const layers = [];
    let elToMatch = undefined;
    const scoreEl = document.querySelector('#score');
    const containerEl = document.querySelector('#container');
    const audioEl = document.querySelector('audio');
    // Make deck
    scoreEl.innerHTML = score.toFixed(0);
    const deckElement = document.createElement('div');
    deckElement.className = 'deck';
    containerEl.appendChild(deckElement);
    deal();
}
makeGame(5, 5, 50, 3, 3000);
//# sourceMappingURL=index.js.map