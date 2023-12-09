import { Field } from './utils/field.js';

class Vultus {
    constructor() {
        this.cache = new Map();
        this.levenshteinCache = new Map();
        this.docs = [];
        this.fields = [];
    }

    addDoc(doc) {
        this.docs.push(doc);
    }

    addField(fieldName) {
        this.fields.push(new Field(fieldName));
    }

    search(query, parameters) {
        const cacheKey = this.#createCacheKey(query, parameters);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        if (parameters) {
            this.#setParameters(parameters);
        }

        const queryWords = query.toLowerCase().split(/\s+/);
        let scoredDocs = this.docs.map(doc => {
            let score = this.#calculateScore(doc, queryWords);
            return { doc, score };
        });

        scoredDocs = scoredDocs.filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score);

        let uniqueDocs = new Set();
        const sortedDocs = [];

        for (const item of scoredDocs) {
            const docStr = JSON.stringify(item.doc);
            if (!uniqueDocs.has(docStr)) {
                uniqueDocs.add(docStr);
                sortedDocs.push(item.doc);
            }
        }

        this.cache.set(cacheKey, sortedDocs);

        return sortedDocs;
    }

    #createCacheKey(query, parameters) {
        return JSON.stringify({ query, parameters });
    }

    #calculateScore(doc, queryWords) {
        let score = 0;

        for (const field of this.fields) {
            if (doc[field.name]) {
                const fieldContent = this.#sanitizeText(doc[field.name]);
                const fieldWeight = field.weight || 1;

                if (queryWords.length > 1) {
                    score += this.#calculatePhraseScore(fieldContent, queryWords, fieldWeight);
                }

                score += this.#calculateWordScore(fieldContent, queryWords, fieldWeight);
            }
        }

        return score;
    }

    #calculatePhraseScore(fieldContent, queryWords, fieldWeight) {
        let score = 0;
        const fullQuery = this.#sanitizeText(queryWords.join(' '));
        const someThreshold = 3;

        for (let i = 0; i <= fieldContent.length - fullQuery.length;) {
            const substring = fieldContent.substring(i, i + fullQuery.length);
            const distance = this.#levenshteinDistance(fullQuery, substring);
            if (distance < someThreshold) {
                score += fieldWeight * 2 / (distance + 1);
                i += fullQuery.length;
            } else {
                i++;
            }
        }

        return score;
    }

    #calculateWordScore(fieldContent, queryWords, fieldWeight) {
        let score = 0;
        const sanitizedQueryWords = queryWords.map(word => this.#sanitizeText(word));
        const fieldContentWords = fieldContent.split(/\s+/);

        for (const word of sanitizedQueryWords) {
            for (const fieldWord of fieldContentWords) {
                const distance = this.#levenshteinDistance(word, fieldWord);
                if (distance < 3) {
                    score += fieldWeight / (distance + 1);
                }
            }
        }

        return score;
    }

    #sanitizeText(text) {
        return text.replace(/[^\w\s]/gi, '').toLowerCase();
    }

    #levenshteinDistance(a, b) {
        const cacheKey = `${a}:${b}`;
        if (this.levenshteinCache.has(cacheKey)) {
            return this.levenshteinCache.get(cacheKey);
        }

        const matrix = [];
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
                }
            }
        }

        const result = matrix[b.length][a.length];
        this.levenshteinCache.set(cacheKey, result);
        return result;
    }


    #setParameters(parameters) {
        if (parameters && parameters.fields) {
            for (const fieldName in parameters.fields) {
                const fieldParams = parameters.fields[fieldName];
                const field = this.fields.find(f => f.name === fieldName);
                if (field && fieldParams.weight) {
                    field.setWeight(fieldParams.weight);
                }
            }
        }
    }
}

export { Vultus };