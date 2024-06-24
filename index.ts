

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

/**
 * Partition an array according to a partition function.
 * The partition function is of the form (elem: T, index?: number, array?: Array<T>) => string | number
 * and returns a key value for the item.
 * Returns an object whose properties are the partitioned keys.  The value of these properties
 * is an array of items belonging to the partition.
 * @example
 `const lookup: { [key: string]: string; } =
 {H: 'Hearts', D: 'Diamonds', S: 'Spades', C: 'Clubs' };
 ['4H', 'KD', '3S', 'AS', '9H'].partition( (e: string) => lookup[e[1]]);`

 { Hearts: ["4H", "9H"], Diamonds: ["KD"], Spades: ["3S", "AS"] }

 * @param filter A PartitionFunc
 */

type Partition<T> = {
    [Key in string | number]: Array<T>;
};

type PartitionFunc<T> = (item: T, index?: number, array?: Array<T>) => string | number

Object.defineProperty(Array.prototype, 'partition', {
    value:
        function <T>(filter: PartitionFunc<T>) {
            const partitions: Partition<T> = {};
            let index = 0;
            for (const item of this) {
                const k = filter(item, index++, this);
                if (partitions[k] === undefined)
                    partitions[k] = [];
                partitions[k].push(item);
            }
            return partitions;
        }
})

const gameNum = 0;


function histogram(data: number[], nBins: number, binWidth : number):  number[] {


    const hist = new Array<number>(nBins).fill(0);    // @ts-ignore

    for (const v of data) {
        const binNum = Math.floor(v / binWidth)
        if (binNum >= 0 && binNum < nBins)
            ++hist[binNum];
    }

    return hist
}

function plotHistogram(containerEl: HTMLDivElement, data: number[]) {
    const dataMax = Math.max(...data)

    const nBins = 60
    // make chart a whole multiple of 10 seconds.
    // binWidth is a whole number of seconds in milliseconds
    const binWidth = 1_000 * (Math.floor(dataMax / 60_000) + 1)
    const hist = histogram(data, nBins, binWidth)
    const maxHistValue = Math.max(...hist)
    // Clear the container
    containerEl.innerHTML = "";
    // Create a reaction time bar chart, with .5s per column from 0s to max(30, histInfo.max)
    const chart = document.createElement('div');
    chart.className = 'chart';  // CSS class
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
async function game(instructions: string, set: string[], rows: number, cols: number, numInitialSets: number, setSize : number, setsToAddPerTimeout : number, timeoutMs: number = 3000) {

    const timeoutActionType: "hint" | "add" | "remove" = setsToAddPerTimeout === 0 ? "hint" : setsToAddPerTimeout > 0 ? "add" : "remove"
    let addMoreSets = true
    let setsRemaining = 0
    let timerHandle: number | undefined = undefined
    let lastMatchTime = 0;
// Hack
    let lock: boolean = false;
    let numTilesDealt = 0;
    const reactionTimes: number[] = []

    return new Promise<void>((resolve, reject) => {
        (document.querySelector('#instructions') as HTMLDivElement).innerHTML = instructions;
        addMoreSets = timeoutMs > 0;
        const grid_len = rows * cols
        // create a grid
        const grid: number[] = new Array<number>(grid_len).fill(0)

        let numMatches = 0;
        let matchingCells: HTMLDivElement[] = [];
        const i2rc = (i: number): [number, number] => [ Math.floor(i / rows), i % rows]

        const getGridIndexWithFewestTiles = (): number => {
            const p: { i: number, h: number}[] = [];
            for (let i = 0;  i < grid_len; ++i)
                p.push({i: i, h: grid[i]} )
            p.sort((a, b) => a.h - b.h)
            let h = p[0].h
            const lp: number[] = []
            lp.push(p[0].i)
            for (let j = 1; j < grid_len; ++j)
                if (p[j].h > h)
                    break;
                else {
                    lp.push(p[j].i)
                }

            // @ts-ignore
            return lp.shuffle()[0]

        }
        const topTiles =(): HTMLDivElement[] => {
            const tiles: HTMLDivElement[] = new Array(grid_len).fill(undefined)
            for (const el of document.querySelectorAll('.tile')) {
                const [locS, zIndexS] = el.id.split('-')
                const loc = parseInt(locS)
                const zIndex = parseInt(zIndexS)
                if (tiles[loc] === undefined || zIndex > parseInt(tiles[loc].id.split('-')[1]))
                    tiles[loc] = el as HTMLDivElement

            }
            return tiles
        }

        const findAVisibleSet = (): HTMLDivElement[] => {
            const tiles = topTiles()
            const visibleTiles = tiles.filter(t => t !== undefined && !t.classList.contains('rotateOut'))
            // @ts-ignore
            const partitions = visibleTiles.partition((t: HTMLDivElement) => set !== emojiImgs ? t.innerText : (<HTMLImageElement>t.firstElementChild).src)
            for (const key in partitions)
                if (partitions[key].length >= setSize)
                    return partitions[key]
            return []
        }
        const makeTileAtIndex = (i: number): void => {

            // Images must always be unique
            if (emoji_idx > emojis.length-1)
                return;

            const v: string = emojis[emoji_idx];

            const comparator = set === emojiImgs  ?
                (a: HTMLDivElement, b: HTMLDivElement) => (<HTMLImageElement>(a.firstElementChild)).src === (<HTMLImageElement>(b.firstElementChild)).src
                : (a: HTMLDivElement, b: HTMLDivElement) => a.innerText === b.innerText
            // https://stackoverflow.com/questions/48419167/how-to-convert-one-emoji-character-to-unicode-codepoint-number-in-javascript
            // @ts-ignore
            console.log([...v].map(e => e.codePointAt(0).toString(16)).join(`-`)) // gives correctly 1f469-200d-2695-fe0
            const tileEl = document.createElement('div');
            const [r, c] = i2rc(i)

            ++grid[i];
            const zIndex = 1000 + numTilesDealt++;
            tileEl.classList.add('tile')
            tileEl.style.zIndex = `${zIndex}`
            tileEl.id = `${i}-${zIndex-1000}`;
            if (set === emojiImgs)
                tileEl.innerHTML = `<img src="imgs/${v}.png">`
            else
                tileEl.innerText = v
            tileEl.style.gridRow = `${r + 1}`
            tileEl.style.gridColumn = `${c + 1}`
            tileEl.style.animation = "fade-in .2s, grow .5s";
            deckEl.appendChild(tileEl);

            tileEl.ontransitionend = () => {
                if (tileEl.classList.contains('rotateOut'))
                    tileEl.remove();
                else
                    tileEl.classList.remove("rotateBack");

            }
            tileEl.ontransitionstart = () => {
                if (tileEl.classList.contains('rotateOut'))
                    --grid[i];
            }
            const touched = (e: Event) => {
                e.preventDefault();
                if (lock)
                    return;
                lock = true;
                if (matchingCells.length == 0) {
                    tileEl.classList.add("selected");
                    matchingCells.push(tileEl)
                } else if (!matchingCells.includes(tileEl) && comparator(tileEl, matchingCells[0])) {


                    matchingCells.push(tileEl)
                    tileEl.classList.add("selected");
                    if (++numMatches == setSize-1) {
                        if (lastMatchTime != 0) {
                            const elapsed = Date.now() - lastMatchTime;

                            reactionTimes.push(elapsed)
                            if (reactionTimes.length > 0) {
                                (document.querySelector('.mean-reaction-time') as HTMLDivElement).innerText = `Mean reaction time: ${(reactionTimes.reduce((a, b) => a + b) / reactionTimes.length / 1000).toFixed(1)}`
                                plotHistogram(document.querySelector('.histogram') as HTMLDivElement, reactionTimes)
                            }
                        }
                        lastMatchTime = Date.now();
                        numMatches = 0;
                        setsRemaining -= 1;
                        audioEl.pause();
                        audioEl.currentTime = 0
                        audioEl.play();

                        setsRemainingEl.innerHTML = setsRemaining.toFixed(0)

                        for (const cell of matchingCells)
                            cell.classList.add('rotateOut')
                        matchingCells = []
                        // Start timer if not already started
                        if (timerHandle === undefined && addMoreSets)
                            timerHandle = setTimeout(delayedDeal, timeoutMs);
                        if (setsRemaining === 0) {
                            addMoreSets = false;
                            clearTimeout(timerHandle);
                            // Game over
                            resolve();
                        }

                    }
                } else {
                    for (const cell of matchingCells) {
                        cell.classList.remove("selected");
                        cell.classList.add('rotateBack')
                    }
                    matchingCells = []
                    numMatches = 0;
                    tileEl.classList.add("rotateBack");

                }
                lock = false;
            }
            tileEl.addEventListener('mousedown', touched)
            tileEl.addEventListener('touchstart', touched)



            return;

        }


        const dealSet = (n: number):number[] => {

            const tileIndices: number[] = [] // Value is irrelevant, gets set in do loop
            // Add a tile at lowest pile
            tileIndices.push(getGridIndexWithFewestTiles())
            let tempIndex = 0; // Value is irrelevant, gets set in do loop

            for (let i = 0; i < n-1; ++i) {
                // Add a matching tile anywhere except on the same grid location as any of the other tiles
                do {
                    tempIndex = Math.floor(Math.random() * grid_len)
                } while (tileIndices.includes(tempIndex));
                tileIndices.push(tempIndex)
            }
            for (const gridIndex of tileIndices)
                makeTileAtIndex(gridIndex)
            ++emoji_idx;
            ++setsRemaining;
            setsRemainingEl.innerHTML = setsRemaining.toFixed(0)
            return tileIndices
        }
        const delayedDeal = () => {
            // will re-trigger continuously until addMoreSets is false
            // or a match has occurred less than timeoutMs ago
            if (Date.now() - lastMatchTime > timeoutMs) {

                if (timeoutActionType === "hint") {
                    const s = findAVisibleSet()
                    if (s.length && matchingCells.length === 0)
                        for (const cell of s)
                            cell.classList.add('rotateBack')
                } else if (timeoutActionType === "add") {
                    for (let np = 0; np < setsToAddPerTimeout; ++np)
                        dealSet(setSize);
                } else {
                    // Remove a set
                    const s = findAVisibleSet()
                    for (const cell of s) {
                        cell.classList.add('rotateOut')

                    }
                    --setsRemaining;
                    setsRemainingEl.innerHTML = setsRemaining.toFixed(0)
                    if (setsRemaining === 0) {
                        addMoreSets = false;
                        clearTimeout(timerHandle);
                        // Game over
                        resolve();
                    }

                }

            }
            if (addMoreSets)
                timerHandle = setTimeout(delayedDeal, timeoutMs)

        }
        const deal = () => {
            // Make the background
            // for (let i = 0; i < grid_len; ++i)
            //     makeTileAtIndex(i, true);
            let setNum = 0;
            const to = setInterval(() => {
                if (setNum++ < numInitialSets)
                    dealSet(setSize);
                else
                    clearInterval(to)
            }, 50)
            // for (let setNum = 0; set < numInitialSets; ++set)
            //     dealSet();

        }



        // @ts-ignore
        // const emojis = set.slice(0,100).shuffle()
        const emojis = set.shuffle()
        let emoji_idx = 0;



        const layers : string[][] = []
        // let elToMatch: HTMLDivElement | undefined = undefined

        const setsRemainingEl= document.querySelector('#tiles-remaining') as HTMLDivElement;
        const deckEl = document.querySelector('.deck') as HTMLDivElement;
        const audioEl = document.querySelector('audio') as HTMLAudioElement;

        // Make deck

        deckEl.innerHTML = "";
        deckEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        deckEl.style.gridTemplateRows = `repeat(${rows}, 1fr)`;




        deal();

    });



}
// const set = allEmojis
const set = emojiImgs;

(async () => {
// 5 X 5 grid, 50 pairs, 5 seconds before hint
    await game("Match all 50 pairs.", set, 5, 5, 50, 2, 0, 5_000);
// 5 X 5 grid, 100 pairs, 5 seconds  before new two new pairs of tiles are added
    await game("Match pairs. Be quick, or new ones will appear!", set, 5, 5, 100, 2, 2, 5_000);
// 7 X 7 grid, 100 sets of three, 30 seconds  before hint
    await game("Match sets of three.", set, 7, 7, 100, 3, 0, 30_000);
// 7 X 7 grid, 49 sets of three, 20 seconds  before three new sets of tiles are  added
    await game("Match sets of three. Don't take too long finding them!", set, 7, 7, 49, 3, 3, 20_000);
// 9 X 9 grid, 81 sets of three, 30 seconds  before hint
    await game("Match sets of three!", set, 9, 9, 81, 3, 0, 30_000);
// 9 X 9 grid, 81 sets of three, 30 seconds  before  three new sets of tiles are added
    await game("No way you can finish this level.", set, 9, 9, 81, 3, 3, 30_000);
})();




