

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

const gameNum = 0;
const games = [
    { r: 4, c: 4, l: 2 },
    { r: 6, c: 6, l: 5 },
    { r: 10, c: 10, l: 10 }
]


function makeGame(rows: number, cols: number, maxLayer: number) : void {
    const numPairs = rows * cols / 2
    // @ts-ignore
    const allEmojisShuffled = allEmojis.shuffle()
    let score = rows * cols / 2 * maxLayer

    const layers : string[][] = []
    let elToMatch: HTMLDivElement | undefined = undefined

    const scoreEl= document.querySelector('#score') as HTMLDivElement;
    const containerEl = document.querySelector('#container') as HTMLDivElement;
    let sliceIdx = 0
    // Make the layers
    for (let i = 0; i < maxLayer; ++i) {
        if (sliceIdx + numPairs >= allEmojisShuffled.length)
            alert("Todo: Handle exhaustion of emojis");
        const emojis = allEmojisShuffled.slice(sliceIdx, sliceIdx + numPairs)

        sliceIdx += numPairs

        layers.push(emojis.concat(emojis).shuffle())
    }
    // Blank layer
    layers.push(Array(numPairs * 2).fill("") )

    // Make deck
    scoreEl.innerHTML = score.toFixed(0)
    const deckElement = document.createElement('div');
    deckElement.className = 'deck';
    containerEl.appendChild(deckElement);
    for (let layer = 0; layer <= maxLayer; ++layer) {
        let i = 0;
        const emojis = layers[layer]


        for (let row = 0; row < rows; ++row) {
            for (let col = 0; col < cols; ++col) {
                const cellElement = document.createElement('div');
                cellElement.classList.add('tile')
                cellElement.style.zIndex = `${1000-layer}`
                cellElement.id = `${layer}-${i}`;
                cellElement.innerText = emojis[i++]
                cellElement.style.left = col * 80 + "px"
                cellElement.style.top = row * 80 + "px"
                deckElement.appendChild(cellElement);
                cellElement.ontransitionend = () => {
                    if (cellElement.classList.contains('rotateOut'))
                        cellElement.remove();
                    else
                        cellElement.classList.remove("rotateBack");

                }
                cellElement.addEventListener('click', () => {
                    if (cellElement.innerText !== "") {
                        if (elToMatch === undefined) {
                            cellElement.classList.add("selected");
                            elToMatch = cellElement
                        } else if (cellElement.innerText === elToMatch.innerText && cellElement !== elToMatch) {
                            score -= 1;
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
                    }
                })
            }
        }
    }
}


makeGame(6, 8, 10);

