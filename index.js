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
Object.defineProperty(Array.prototype, 'partition', {
    value: function (filter) {
        const partitions = {};
        let index = 0;
        for (const item of this) {
            const k = filter(item, index++, this);
            if (partitions[k] === undefined)
                partitions[k] = [];
            partitions[k].push(item);
        }
        return partitions;
    }
});
async function game(instructions, set, cols, rows, numInitialSets, setSize, timeoutMs = 3000) {
    const scoreEl = document.querySelector('#score');
    // const timeoutActionType: "hint" | "add" | "remove" = setsToAddPerTimeout === 0 ? "hint" : setsToAddPerTimeout > 0 ? "add" : "remove"
    // let foundAtLeastOneMatch = false; // We don't do the timeout action until the after the first successful match
    let setsRemaining = 0;
    let lastMatchTime = 0;
    // Hack
    let lock = false;
    let numTilesDealt = 0;
    let totalScore = 0;
    return new Promise((resolve) => {
        document.querySelector('#instructions').innerHTML = instructions;
        const grid_len = cols * rows;
        // create a grid
        const grid = new Array(grid_len).fill(0);
        let numMatches = 0;
        let matchingCells = [];
        let hintCells = []; // Cells that are currently being hinted at
        const i2rc = (i) => [Math.floor(i / cols), i % cols];
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
        const topTiles = () => {
            const tiles = new Array(grid_len).fill(undefined);
            for (const el of document.querySelectorAll('.tile')) {
                const [locS, zIndexS] = el.id.split('-');
                const loc = parseInt(locS);
                const zIndex = parseInt(zIndexS);
                if (tiles[loc] === undefined || zIndex > parseInt(tiles[loc].id.split('-')[1]))
                    tiles[loc] = el;
            }
            return tiles;
        };
        const findAVisibleSet = () => {
            const tiles = topTiles();
            const visibleTiles = tiles.filter(t => t !== undefined && !t.classList.contains('rotateOut'));
            // @ts-ignore
            const partitions = visibleTiles.partition((t) => set !== emojiImgs ? t.innerText : t.firstElementChild.src);
            for (const key in partitions)
                if (partitions[key].length >= setSize)
                    return partitions[key];
            return [];
        };
        const makeTileAtIndex = (i) => {
            // Images must always be unique
            if (emoji_idx > emojis.length - 1)
                return;
            const v = emojis[emoji_idx];
            const comparator = set === emojiImgs ?
                (a, b) => (a.firstElementChild).src === (b.firstElementChild).src
                : (a, b) => a.innerText === b.innerText;
            // https://stackoverflow.com/questions/48419167/how-to-convert-one-emoji-character-to-unicode-codepoint-number-in-javascript
            // @ts-ignore
            // console.log([...v].map(e => e.codePointAt(0).toString(16)).join(`-`)) // gives correctly 1f469-200d-2695-fe0
            const tileEl = document.createElement('div');
            const [r, c] = i2rc(i);
            ++grid[i];
            const zIndex = 1000 + numTilesDealt++;
            tileEl.className = 'tile';
            tileEl.style.zIndex = `${zIndex}`;
            tileEl.id = `${i}-${zIndex - 1000}`;
            if (set === emojiImgs)
                tileEl.innerHTML = `<img src="imgs/${v}.png" alt="${v}">`;
            else
                tileEl.innerText = v;
            tileEl.style.gridRow = `${r + 1}`;
            tileEl.style.gridColumn = `${c + 1}`;
            tileEl.classList.add('fade-in', 'grow');
            tileEl.style.margin = '5px';
            deckEl.appendChild(tileEl);
            tileEl.onanimationend = () => {
                tileEl.className = 'tile'; // Remove all animation classes
            };
            tileEl.ontransitionend = () => {
                if (tileEl.classList.contains('rotateOut'))
                    tileEl.remove();
                else
                    tileEl.className = 'tile'; // Remove all animation classes
            };
            tileEl.ontransitionstart = () => {
                if (tileEl.classList.contains('rotateOut'))
                    --grid[i];
            };
            const touched = (e) => {
                e.preventDefault();
                if (lock)
                    return;
                lock = true;
                for (const cell of hintCells) {
                    cell.classList.remove('hint');
                }
                if (matchingCells.length == 0) {
                    tileEl.classList.add("selected");
                    matchingCells.push(tileEl);
                }
                else if (!matchingCells.includes(tileEl) && comparator(tileEl, matchingCells[0])) {
                    matchingCells.push(tileEl);
                    tileEl.classList.add("selected");
                    // Check if we have a match
                    if (++numMatches == setSize - 1) {
                        // We have a match
                        // foundAtLeastOneMatch = true;  // Only need to set this once in the game, but no harm in setting it multiple times
                        let score = 0; // No score if timeout
                        let msToFindMatch = Date.now() - lastMatchTime;
                        if (msToFindMatch < timeoutMs) {
                            const scoreQuartile = Math.floor((1 - msToFindMatch / timeoutMs) * 4);
                            console.assert(scoreQuartile >= 0 && scoreQuartile <= 3, "Score quartile should be between 0 and 3, inclusive. Got " + scoreQuartile);
                            score = [10, 20, 50, 100][scoreQuartile];
                        }
                        totalScore += score;
                        numMatches = 0;
                        // foundAtLeastOneMatch = true;
                        setsRemaining -= 1;
                        if (score > 0) {
                            const buffer = score == 100 ? matchExcellentAudioBuffer : (score == 50 ? matchGoodAudioBuffer : matchOkAudioBuffer);
                            (async () => { await playAudioBuffer(buffer); })();
                            // playAudioBuffer(buffer);
                        }
                        scoreEl.innerHTML = `Score: ${totalScore.toFixed(0)}  (${setsRemaining.toFixed(0)})`;
                        for (const cell of matchingCells)
                            cell.classList.add('rotateOut');
                        matchingCells = [];
                        resetTimerBar();
                        if (setsRemaining === 0) {
                            // Game over
                            resolve();
                        }
                    }
                }
                else {
                    for (const cell of matchingCells) {
                        cell.classList.remove("selected");
                        cell.classList.add('rotateBack');
                    }
                    matchingCells = [];
                    numMatches = 0;
                    tileEl.classList.add("rotateBack");
                }
                lock = false;
            };
            tileEl.addEventListener('mousedown', touched);
            tileEl.addEventListener('touchstart', touched);
            return;
        };
        const dealSet = (n) => {
            const tileIndices = []; // Value is irrelevant, gets set in do loop
            // Add a tile at lowest pile
            tileIndices.push(getGridIndexWithFewestTiles());
            let tempIndex = 0; // Value is irrelevant, gets set in do loop
            for (let i = 0; i < n - 1; ++i) {
                // Add a matching tile anywhere except on the same grid location as any of the other tiles
                do {
                    tempIndex = Math.floor(Math.random() * grid_len);
                } while (tileIndices.includes(tempIndex));
                tileIndices.push(tempIndex);
            }
            for (const gridIndex of tileIndices)
                makeTileAtIndex(gridIndex);
            ++emoji_idx;
            ++setsRemaining;
            scoreEl.innerHTML = `Score: 0 (${setsRemaining.toFixed(0)})`;
            return tileIndices;
        };
        const userFoundMatchBeforeTimeout = () => {
            return Date.now() - lastMatchTime < timeoutMs;
        };
        const timeoutAction = () => {
            // Find a set of tiles and animate them as a hint
            if (!userFoundMatchBeforeTimeout()) {
                hintCells = findAVisibleSet(); // will always find one
                // console.assert(s.length >= setSize, "There should always be a set of size " + setSize + " visible at this point")
                for (const cell of hintCells)
                    // console.log(cell.classList)
                    cell.classList.add('hint');
            }
        };
        const deal = () => {
            setTimerBarTransitionTime(864_000_000); // 1 day, so it doesn't animate
            resetTimerBar();
            // remove any tiles that were hinted at in a previous game
            document.querySelectorAll('.tile.hint')
                .forEach(el => el.classList.remove('hint'));
            let setNum = 0;
            const to = setInterval(() => {
                if (setNum++ < numInitialSets)
                    dealSet(setSize);
                else {
                    clearInterval(to);
                    setTimerBarTransitionTime(timeoutMs);
                    resetTimerBar();
                }
            }, 50);
            // for (let setNum = 0; set < numInitialSets; ++set)
            //     dealSet();
        };
        const resetTimerBar = () => {
            const onBarEnd = (e) => {
                timeoutAction();
                fill.removeEventListener('animationend', onBarEnd);
            };
            if (timeoutMs <= 0)
                return;
            const fill = document.querySelector('.timer-fill');
            fill.removeEventListener('animationend', onBarEnd);
            fill.style.animation = '';
            void fill.offsetWidth;
            fill.classList.remove('animate');
            void fill.offsetWidth;
            fill.classList.add('animate');
            fill.addEventListener('animationend', onBarEnd, { once: true });
            // fill.addEventListener('animationend', () => alert("Foo"), {once: true});
            lastMatchTime = Date.now();
        };
        const setTimerBarTransitionTime = (milliSeconds) => {
            document.documentElement.style.setProperty('--TRANSITION_TIME', `${milliSeconds / 1000}s`);
        };
        // @ts-ignore
        // const emojis = set.slice(0,100).shuffle()
        const emojis = set.shuffle();
        let emoji_idx = 0;
        const deckEl = document.querySelector('.deck');
        // const audioElGood = document.querySelector('#audio_match_good') as HTMLAudioElement;
        // const audioElOk = document.querySelector('#audio_match_ok') as HTMLAudioElement;
        // Make deck
        deckEl.innerHTML = "";
        deckEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        deckEl.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
        deckEl.style.aspectRatio = `${cols} / ${rows}`; // Set aspect ratio of deck
        deal();
    });
}
const ctx = new AudioContext({ latencyHint: 'playback' });
let matchOkAudioBuffer;
let matchGoodAudioBuffer;
let matchExcellentAudioBuffer;
async function getAudioBufferFromFile(fileName) {
    const resp = await fetch(fileName);
    const array = await resp.arrayBuffer();
    return await ctx.decodeAudioData(array);
}
async function playAudioBuffer(buffer) {
    if (ctx.state !== "running") {
        await ctx.resume(); // Ensures context is live
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    setTimeout(() => {
        src.start();
    }, 0);
    return new Promise((resolve) => {
        src.onended = () => {
            resolve();
        };
    });
}
// Call init() on startup, then playChimeBuffer() whenever you need the chime
// const set = allEmojis
const set = emojiImgs;
(async () => {
    // Init audio
    matchOkAudioBuffer = await getAudioBufferFromFile('/audio/match_ok.mp3');
    matchGoodAudioBuffer = await getAudioBufferFromFile('/audio/match_good.mp3');
    matchExcellentAudioBuffer = await getAudioBufferFromFile('/audio/match_excellent.mp3');
    await game("Match all 50 pairs.", set, 4, 6, 50, 2, 10_000);
    await game("Match sets of three.", set, 5, 8, 100, 3, 30_000);
    await game("Match sets of three!", set, 5, 9, 100, 3, 20_000);
    await game("Match sets of three!", set, 6, 9, 100, 3, 30_000);
    await game("No way you can finish this level.", set, 6, 9, 200, 3, 30_000);
})();
//# sourceMappingURL=index.js.map