class Field {
    constructor(name) {
        this.name = name;
        this.weight = 0;
    }

    setWeight(weight) {
        this.weight = weight;
    }
}

export { Field };