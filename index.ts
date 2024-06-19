

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
let addMorePairs = true
const gameNum = 0;
const games = [
    { r: 4, c: 4, l: 2 },
    { r: 6, c: 6, l: 5 },
    { r: 10, c: 10, l: 10 }
]
let timerHandle: number | undefined = undefined
// Hack
let blockClick: boolean = false;
function makeGame(rows: number, cols: number, numPairs: number) {
    const grid_len = rows * cols
    // create a grid
    const grid: number[] = new Array<number>(grid_len).fill(0)

    const i2rc = (i: number): [number, number] => [ Math.floor(i / rows), i % rows]

    const lowest_pile_idx = (): number => {
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
    const makeTileAtIndex = (i: number, isBackGroundTile = false): HTMLDivElement => {

        const sz = 120;
        const fsz = 64;
        const h = grid[i]
        const v: string = isBackGroundTile? "" : allEmojisShuffled[emoji_idx];
        const cellElement = document.createElement('div');
        const [r, c] = i2rc(i)

        ++grid[i];

        cellElement.classList.add('tile')
        cellElement.style.zIndex = `${1000 + h}`
        cellElement.id = `${i2rc(i)}-${h}`;
        cellElement.innerText = v
        cellElement.style.left = c * sz + "px"
        cellElement.style.top = r * sz + "px"
        cellElement.style.width = sz + "px"
        cellElement.style.height = sz + "px"
        cellElement.style.fontSize = fsz + "pt"
        cellElement.style.animation = "fade-in 1s";
        deckElement.appendChild(cellElement);

        cellElement.ontransitionend = () => {
            if (cellElement.classList.contains('rotateOut')) {
                cellElement.remove();
                --grid[i];
            } else
                cellElement.classList.remove("rotateBack");

        }
        if (!isBackGroundTile)
            cellElement.addEventListener('click', () => {
                if (blockClick)
                    return;

                if (elToMatch === undefined) {
                    cellElement.classList.add("selected");
                    elToMatch = cellElement
                } else if (cellElement.innerText === elToMatch.innerText && cellElement !== elToMatch) {
                    score -= 1;
                    clearInterval(timerHandle);
                    if (addMorePairs)
                        timerHandle = setInterval(() => {
                            blockClick = true;
                            for (let np = 0; np < 2; ++np)
                                dealPair();
                            blockClick = false;

                        }, 3 * 1000)
                    scoreEl.innerHTML = score.toFixed(0)
                    elToMatch.classList.add('rotateOut')
                    cellElement.classList.add('rotateOut')
                    elToMatch = undefined;
                } else {
                    cellElement.classList.add("rotateBack");
                    elToMatch.classList.add("rotateBack");
                    elToMatch.classList.remove("selected");
                    elToMatch = undefined;
                }

            })

        return cellElement;

    }

    const dealPair = () => {
        const firstTileIdx = lowest_pile_idx()
        let secondTileIndex = 0; // Value is irrelevant, gets set in do loop

        // Add a tile at lowest pile
        makeTileAtIndex(firstTileIdx)

        // Add a matching tile anywhere except on the same pile as the first tile
        do {
            secondTileIndex = Math.floor(Math.random() * grid_len)
        } while (secondTileIndex === firstTileIdx);
        makeTileAtIndex(secondTileIndex)
        ++emoji_idx;
        ++score;
        scoreEl.innerHTML = score.toFixed(0)




    }
    const deal = () => {
        // Make the background
        for (let i = 0; i < grid_len; ++i)
            makeTileAtIndex(i, true);
        for (let pair = 0; pair < numPairs; ++pair)
            dealPair();

    }

    // @ts-ignore
    const allEmojisShuffled = allEmojis.shuffle()
    let emoji_idx = 0;

    let score = 0

    const layers : string[][] = []
    let elToMatch: HTMLDivElement | undefined = undefined

    const scoreEl= document.querySelector('#score') as HTMLDivElement;
    const containerEl = document.querySelector('#container') as HTMLDivElement;

    // Make deck
    scoreEl.innerHTML = score.toFixed(0)
    const deckElement = document.createElement('div');
    deckElement.className = 'deck';
    containerEl.appendChild(deckElement);


    deal();


}

makeGame(5, 5, 50);



