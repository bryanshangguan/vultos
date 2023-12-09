async function vultus() {
    this.jsonFile = null;
}

Vultus.prototype.setFile = async function (filePath) {
    try {
        const response = await fetch(filePath);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const reader = response.body.getReader();
        let receivedLength = 0;
        let chunks = [];
        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                break;
            }

            chunks.push(value);
            receivedLength += value.length;
        }

        let chunksAll = new Uint8Array(receivedLength);
        let position = 0;
        for (let chunk of chunks) {
            chunksAll.set(chunk, position);
            position += chunk.length;
        }

        let resultString = new TextDecoder("utf-8").decode(chunksAll);
        this.jsonFile = JSON.parse(resultString);
    } catch (error) {
        console.error("Error during fetch/stream processing:", error);
    }
};

Vultus.prototype.log = function () {
    console.log(this.jsonFile);
};

export { vultus }