import { Field } from './field.js';
import { list_2_3, list_4 } from './lists.js';

export default class Vultus {
    constructor(config) {
        this.schema = config.schema;
        this.cache = new Map();
        this.levenshteinCache = new Map();
        this.docs = [];
        this.fields = [];

        for (const key in this.schema) {
            this.fields.push(new Field(key));
        }
    }

    addDoc(doc) {
        if (this.#validateDoc(doc)) {
            this.docs.push(doc);
        } else {
            console.error('Document does not match schema:', doc);
        }
    }

    #validateDoc(doc) {
        for (const key in this.schema) {
            if (!doc.hasOwnProperty(key) || typeof doc[key] !== this.schema[key]) {
                return false;
            }
        }
        return true;
    }

    search(query, parameters) {
        const startTime = performance.now();

        if (parameters) {
            const validKeys = ['fields', 'where'];
            for (const key in parameters) {
                if (!validKeys.includes(key)) {
                    console.error(`Unexpected parameter key '${key}'. Expected keys are 'fields' and 'where'`);
                    return;
                }
            }

            this.#setParameters(parameters);
        }

        try {
            const cacheKey = this.#createCacheKey(query, parameters);
            if (this.cache.has(cacheKey)) {
                const cachedResults = this.cache.get(cacheKey);
                return {
                    elapsed: performance.now() - startTime,
                    count: cachedResults.length,
                    hits: cachedResults
                };
            }            

            const queryWords = query.toLowerCase().split(/\s+/);
            let filteredDocs = this.docs;

            if (parameters && parameters.where) {
                filteredDocs = this.#applyWhereClause(filteredDocs, parameters.where);
            }

            let scoredDocs = filteredDocs.map(doc => {
                let score = this.#calculateScore(doc, queryWords);
                return { doc, score };
            });

            scoredDocs = scoredDocs.filter(item => item.score > 0)
                .sort((a, b) => b.score - a.score);

            let uniqueDocs = new Set();
            const hits = [];

            for (const item of scoredDocs) {
                const docStr = JSON.stringify(item.doc);
                if (!uniqueDocs.has(docStr)) {
                    uniqueDocs.add(docStr);
                    hits.push({ score: item.score, document: item.doc });
                }
            }

            this.cache.set(cacheKey, hits);

            const endTime = performance.now();

            return {
                elapsed: endTime - startTime,
                count: hits.length,
                hits: hits
            };

        } catch (error) {
            console.error(error.message);
            return;
        }
    }

    #applyWhereClause(docs, whereClause) {
        for (const key in whereClause) {
            if (!this.schema.hasOwnProperty(key)) {
                throw new Error(`Field '${key}' does not exist in the schema`);
            }

            const condition = whereClause[key];
            const expectedType = this.schema[key];

            if (typeof condition === 'object' && condition !== null) {
                if (condition.between && Array.isArray(condition.between) && condition.between.length === 2) {
                    if (expectedType !== 'number') {
                        throw new Error(`Field '${key}' is not a number, but a 'between' condition was used`);
                    }
                } else {
                    throw new Error(`Unsupported condition for field '${key}'.`);
                }
            } else {
                if (typeof condition === 'boolean' && expectedType !== 'boolean') {
                    throw new Error(`Field '${key}' is not a boolean, but a boolean condition was used`);
                }
            }
        }

        return docs.filter(doc => {
            for (const key in whereClause) {
                const condition = whereClause[key];
                const docValue = doc[key];

                if (typeof condition === 'object' && condition !== null) {
                    const [min, max] = condition.between;
                    if (docValue < min || docValue > max) {
                        return false;
                    }
                } else {
                    if (docValue !== condition) {
                        return false;
                    }
                }
            }
            return true;
        });
    }

    #createCacheKey(query, parameters) {
        return JSON.stringify({ query, parameters });
    }

    #setParameters(parameters) {
        if (parameters && parameters.fields) {
            for (const fieldName in parameters.fields) {
                const fieldParams = parameters.fields[fieldName];
                const field = this.fields.find(f => f.name === fieldName);
                if (field && fieldParams.weight !== undefined) {
                    if (fieldParams.weight > 5) {
                        console.warn(`Weight for field '${fieldName}' is too high, setting to 5`);
                        field.setWeight(5);
                    } else if (fieldParams.weight < 1) {
                        console.warn(`Weight for field '${fieldName}' is too low, setting to 1`);
                        field.setWeight(1);
                    } else {
                        field.setWeight(fieldParams.weight);
                    }
                }
            }
        }
    }

    #calculateScore(doc, queryWords) {
        let score = 0;
        let maxPossibleScore = 0;

        for (const field of this.fields) {
            if (doc[field.name] !== undefined) {
                const fieldType = this.schema[field.name];
                const fieldContent = doc[field.name];
                const fieldWeight = field.weight || 1;
                maxPossibleScore += fieldWeight * 5;

                if (fieldType === 'string') {
                    const sanitizedFieldContent = this.#sanitizeText(fieldContent);
                    if (queryWords.length > 1) {
                        score += this.#calculatePhraseScore(sanitizedFieldContent, queryWords, fieldWeight);
                    }
                    score += this.#calculateWordScore(sanitizedFieldContent, queryWords, fieldWeight);
                } else if (fieldType === 'number') {
                    score += this.#calculateNumberScore(fieldContent, queryWords, fieldWeight);
                } else if (fieldType === 'boolean') {
                    score += this.#calculateBooleanScore(fieldContent, queryWords, fieldWeight);
                }
            }
        }

        return maxPossibleScore > 0 ? Math.min(score / maxPossibleScore, 1) : 0;
    }

    #calculatePhraseScore(fieldContent, queryWords, fieldWeight) {
        let score = 0;
        const fullQuery = this.#sanitizeText(queryWords.join(' '));
        const someThreshold = 3;

        for (let i = 0; i <= fieldContent.length - fullQuery.length;) {
            const substring = fieldContent.substring(i, i + fullQuery.length);
            const distance = this.#levenshteinDistance(fullQuery, substring);
            if (distance < someThreshold) {
                score += fieldWeight * 5 / (distance + 1);
                i += fullQuery.length;
            } else {
                i++;
            }
        }

        return score;
    }

    #calculateWordScore(fieldContent, queryWords, fieldWeight) {
        let score = 0;
        const sanitizedQueryWords = queryWords.map(word => this.#stemmer(this.#sanitizeText(word)));
        const fieldContentWords = fieldContent.split(/\s+/).map(word => this.#stemmer(word));

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

    #calculateNumberScore(fieldContent, queryWords, fieldWeight) {
        let score = 0;
        queryWords.forEach(queryWord => {
            if (!isNaN(queryWord) && Number(queryWord) === fieldContent) {
                score += fieldWeight;
            }
        });
        return score;
    }

    #calculateBooleanScore(fieldContent, queryWords, fieldWeight) {
        let score = 0;
        const booleanQueryWords = queryWords.map(word => {
            if (word === 'true') return true;
            if (word === 'false') return false;
            return null;
        });

        booleanQueryWords.forEach(queryWord => {
            if (queryWord !== null && queryWord === fieldContent) {
                score += fieldWeight;
            }
        });

        return score;
    }

    #sanitizeText(text) {
        if (typeof text === 'string') {
            return text.replace(/[^\w\s]/gi, '').toLowerCase();
        }
        return text;
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

    #stemmer(word) {
        const reEdIngLy = /(ed|edly|ing|ingly)$/;
        const reAtBlIz = /(at|bl|iz)$/;
        const reDoubleConsonant = /([^aeiouylsz])\1$/;
        const reCvc = /[^aeiou][aeiouy][^aeiouwxy]$/;

        word = word.replace(/(sses|ies)$/, "ss");
        word = word.replace(/([^s])s$/, "$1");

        if (/(eed|eedly)$/.test(word)) {
            word = word.replace(/(eed|eedly)$/, "ee");
        } else if (reEdIngLy.test(word)) {
            const base = word.replace(reEdIngLy, "");
            if (reAtBlIz.test(base)) {
                word = base + "e";
            } else if (reDoubleConsonant.test(base)) {
                word = base.slice(0, -1);
            } else if (reCvc.test(base)) {
                word = base + "e";
            } else {
                word = base;
            }
        }

        word = word.replace(/(y|Y)$/, "i");

        const step2and3list = list_2_3;
        const step4list = list_4;

        for (let [suffix, replacement] of Object.entries(step2and3list)) {
            if (word.endsWith(suffix)) {
                word = word.replace(new RegExp(suffix + "$"), replacement);
                return word;
            }
        }

        for (let suffix of step4list) {
            if (word.endsWith(suffix)) {
                word = word.replace(new RegExp(suffix + "$"), "");
                return word;
            }
        }

        word = word.replace(/e$/, "");
        word = word.replace(/(ll)$/, "l");

        return word;
    }
}