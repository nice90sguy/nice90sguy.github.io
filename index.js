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
const reactionTimes = [];
function histogram(data, nBins, binWidth) {
    const hist = new Array(nBins).fill(0); // @ts-ignore
    for (const v of data) {
        const binNum = Math.floor(v / binWidth);
        if (binNum >= 0 && binNum < nBins)
            ++hist[binNum];
    }
    return hist;
}
function plotHistogram(containerEl, data) {
    const dataMax = Math.max(...data);
    const nBins = 60;
    // make chart a whole multiple of 10 seconds.
    // binWidth is a whole number of seconds in milliseconds
    const binWidth = 1_000 * (Math.floor(dataMax / 60_000) + 1);
    const hist = histogram(data, nBins, binWidth);
    const maxHistValue = Math.max(...hist);
    // Clear the container
    containerEl.innerHTML = "";
    // Create a reaction time bar chart, with .5s per column from 0s to max(30, histInfo.max)
    const chart = document.createElement('div');
    chart.className = 'chart'; // CSS class
    chart.style.gridTemplateColumns = `repeat(${nBins}, 5px)`;
    containerEl.appendChild(chart);
    for (let i = 0; i < nBins; ++i) {
        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = `${hist[i] / maxHistValue * 100}px`;
        bar.style.gridColumn = `${i + 1}`;
        bar.style.gridRow = '1';
        bar.style.transform = `translateY(${100 - hist[i] / maxHistValue * 100}px)`;
        chart.appendChild(bar);
        // if (i % 10 == 0) {
        //     const xLabel = document.createElement('div');
        //     xLabel.className = 'x-label';
        //     xLabel.style.gridRow = '2';
        //     xLabel.style.gridColumn = `${i + 1} / span 10`
        //     xLabel.innerText = `${i}`;
        //     chart.appendChild(xLabel);
        // }
    }
    // Add x-axis labels
    // const xLabels = document.createElement('div');
    // xLabels.className = 'x-labels';
    // containerEl.appendChild(xLabels);
    // for (let i = 0; i < histInfo.hist.length; ++i) {
    //     const label = document.createElement('div');
    //     label.className = 'x-label';
    //     label.style.width = `${barWidth}%`;
    //     label.style.left = `${i * barWidth}%`;
    //     label.innerText = `${(i * histInfo.max / histInfo.hist.length / 1000).toFixed(0)}`
    //     xLabels.appendChild(label);
    // }
}
function makeGame(rows, cols, numPairs, pairSize = 2, pairsPerTimeout = 2, timeoutMs = 3000) {
    const grid_len = rows * cols;
    // create a grid
    const grid = new Array(grid_len).fill(0);
    let lastMatchTime = 0;
    let numMatches = 0;
    let matchingCells = [];
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
        const sz = Math.floor(600 / cols);
        const fsz = Math.floor(sz / 2);
        const h = grid[i];
        const v = emojis[emoji_idx];
        const comparator = set === emojiImgs ?
            (a, b) => (a.firstElementChild).src === (b.firstElementChild).src
            : (a, b) => a.innerText === b.innerText;
        // https://stackoverflow.com/questions/48419167/how-to-convert-one-emoji-character-to-unicode-codepoint-number-in-javascript
        // @ts-ignore
        console.log([...v].map(e => e.codePointAt(0).toString(16)).join(`-`)); // gives correctly 1f469-200d-2695-fe0
        const cellElement = document.createElement('div');
        const [r, c] = i2rc(i);
        ++grid[i];
        cellElement.classList.add('tile');
        cellElement.style.zIndex = `${1000 + h}`;
        cellElement.id = `${i2rc(i)}-${h}`;
        if (set === emojiImgs)
            cellElement.innerHTML = `<img src="imgs/${v}.png" width=${sz} height=${sz}>`;
        else
            cellElement.innerText = v;
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
            if (matchingCells.length == 0) {
                cellElement.classList.add("selected");
                matchingCells.push(cellElement);
            }
            else if (!matchingCells.includes(cellElement) && comparator(cellElement, matchingCells[0])) {
                matchingCells.push(cellElement);
                cellElement.classList.add("selected");
                if (++numMatches == pairSize - 1) {
                    if (lastMatchTime != 0) {
                        const elapsed = Date.now() - lastMatchTime;
                        reactionTimes.push(elapsed);
                        if (reactionTimes.length > 0) {
                            document.querySelector('.mean-reaction-time').innerText = `Mean reaction time: ${(reactionTimes.reduce((a, b) => a + b) / reactionTimes.length / 1000).toFixed(1)}`;
                            plotHistogram(document.querySelector('.histogram'), reactionTimes);
                        }
                    }
                    lastMatchTime = Date.now();
                    numMatches = 0;
                    score -= 1;
                    audioEl.pause();
                    audioEl.currentTime = 0;
                    audioEl.play();
                    clearInterval(timerHandle);
                    if (addMorePairs)
                        timerHandle = setInterval(() => {
                            blockClick = true;
                            for (let np = 0; np < pairsPerTimeout; ++np)
                                dealPair(pairSize);
                            blockClick = false;
                        }, timeoutMs);
                    scoreEl.innerHTML = score.toFixed(0);
                    for (const cell of matchingCells)
                        cell.classList.add('rotateOut');
                    matchingCells = [];
                }
            }
            else {
                for (const cell of matchingCells) {
                    cell.classList.remove("selected");
                    cell.classList.add('rotateBack');
                }
                matchingCells = [];
                numMatches = 0;
                cellElement.classList.add("rotateBack");
            }
        });
        return;
    };
    const dealPair = (n) => {
        const tileIndices = []; // Value is irrelevant, gets set in do loop
        // Add a tile at lowest pile
        tileIndices.push(getGridIndexWithFewestTiles());
        let tempIndex = 0; // Value is irrelevant, gets set in do loop
        for (let i = 0; i < n - 1; ++i) {
            // Add a matching tile anywhere except on the same grid location as the first tile
            do {
                tempIndex = Math.floor(Math.random() * grid_len);
            } while (tileIndices.includes(tempIndex));
            tileIndices.push(tempIndex);
        }
        for (const gridIndex of tileIndices)
            makeTileAtIndex(gridIndex);
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
                dealPair(pairSize);
            else
                clearInterval(to);
        }, 100);
        // for (let pair = 0; pair < numPairs; ++pair)
        //     dealPair();
    };
    // const set = allEmojis
    const set = emojiImgs;
    // @ts-ignore
    // const emojis = set.slice(0,100).shuffle()
    const emojis = set.shuffle();
    let emoji_idx = 0;
    let score = 0;
    const layers = [];
    // let elToMatch: HTMLDivElement | undefined = undefined
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
makeGame(8, 8, 100, 3, 3, 350000);
//# sourceMappingURL=index.js.map