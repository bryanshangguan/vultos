import Field from './field.js';
import calculateScore from './score.js';
import * as textUtils from './textUtils.js';

const BATCH_SIZE = 100;

export default class Vultos {
    constructor(config) {
        this.schema = config.schema;
        this.index = new Map();
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
            this.#addToIndex(doc);
        } else {
            console.error('Document does not match schema:', doc);
        }
    }

    addDocs(docsArray) {
        for (let i = 0; i < docsArray.length; i += BATCH_SIZE) {
            const batch = docsArray.slice(i, i + BATCH_SIZE);
            this.#processBatch(batch);
        }
    }

    removeDoc(docToRemove) {
        console.log("before:", this.docs);
        this.docs = this.docs.filter(doc => !this.#equals(doc, docToRemove));

        for (const [term, docsSet] of this.index) {
            for (const doc of Array.from(docsSet)) {
                if (this.#equals(doc, docToRemove)) {
                    docsSet.delete(doc);
                    if (docsSet.size === 0) {
                        this.index.delete(term);
                    }
                }
            }
        }
        console.log("before:", this.docs);
    }

    removeDocs(docsArray) {
        for (let i = 0; i < docsArray.length; i += BATCH_SIZE) {
            const batch = docsArray.slice(i, i + BATCH_SIZE);
            this.#processRemovalBatch(batch);
        }
    }

    search(query, parameters) {
        const startTime = performance.now();
        this.#handleParameters(parameters);

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

            const queryWords = query.toLowerCase().split(/\s+/).map(word => this.#stemmer(this.#sanitizeText(word)));
            let relevantDocs = new Set();

            queryWords.forEach(word => {
                if (this.index.has(word)) {
                    this.index.get(word).forEach(doc => relevantDocs.add(doc));
                }
            });

            let filteredDocs = Array.from(relevantDocs);

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

            const searchResults = {
                elapsed: endTime - startTime,
                count: hits.length,
                hits: hits,
                sortBy: (fieldName) => this.#sortByField(searchResults.hits, fieldName)
            };
        
            return searchResults;
        } catch (error) {
            console.error(error.message);
            return;
        }
    }

    #sortByField(results, fieldName) {
        if (!this.schema.hasOwnProperty(fieldName) || this.schema[fieldName] !== 'string') {
            throw new Error(`Invalid field '${fieldName}'. Only string fields can be sorted.`);
        }
    
        return results.sort((a, b) => a.document[fieldName].localeCompare(b.document[fieldName]));
    }

    #equals(doc1, doc2) {
        const doc1Keys = Object.keys(doc1).sort();
        const doc2Keys = Object.keys(doc2).sort();
        if (JSON.stringify(doc1Keys) !== JSON.stringify(doc2Keys)) {
            return false;
        }

        for (const key of doc1Keys) {
            if (doc1[key] !== doc2[key]) {
                return false;
            }
        }

        return true;
    }

    #processBatch(batch) {
        for (const doc of batch) {
            if (this.#validateDoc(doc)) {
                this.docs.push(doc);
                this.#addToIndex(doc);
            } else {
                console.error('Document does not match schema:', doc);
            }
        }
    }

    #addToIndex(doc) {
        for (const field of this.fields) {
            if (doc[field.name] !== undefined && this.schema[field.name] === 'string') {
                const terms = this.#sanitizeText(doc[field.name]).split(/\s+/);
                terms.forEach(term => {
                    const stemmedTerm = this.#stemmer(term);
                    if (!this.index.has(stemmedTerm)) {
                        this.index.set(stemmedTerm, new Set());
                    }
                    this.index.get(stemmedTerm).add(doc);
                });
            }
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

    #processRemovalBatch(batch) {
        for (const docToRemove of batch) {
            this.#removeDocFromDocsArray(docToRemove);
            this.#removeDocFromIndex(docToRemove);
        }
    }

    #removeDocFromDocsArray(docToRemove) {
        this.docs = this.docs.filter(doc => !this.#equals(doc, docToRemove));
    }

    #removeDocFromIndex(docToRemove) {
        for (const [term, docsSet] of this.index) {
            for (const doc of Array.from(docsSet)) {
                if (this.#equals(doc, docToRemove)) {
                    docsSet.delete(doc);
                    if (docsSet.size === 0) {
                        this.index.delete(term);
                    }
                }
            }
        }
    }

    #handleParameters(parameters) {
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
    }

    #applyWhereClause(docs, whereClause) {
        for (const key in whereClause) {
            if (!this.schema.hasOwnProperty(key)) {
                throw new Error(`Field '${key}' does not exist in the schema`);
            }
    
            const condition = whereClause[key];
            const expectedType = this.schema[key];
            const validConditionKeys = ['lessthan', 'lt', 'greaterthan', 'gt', 'between', 'bt', 'equal', 'eq'];
    
            if (typeof condition === 'object' && condition !== null) {
                for (const conditionKey in condition) {
                    if (!validConditionKeys.includes(conditionKey)) {
                        console.warn(`Unrecognized condition '${conditionKey}' on field '${key}'`);
                        return [];
                    }
    
                    if (conditionKey === 'lt') {
                        condition.lessthan = condition.lt;
                    } else if (conditionKey === 'gt') {
                        condition.greaterthan = condition.gt;
                    } else if (conditionKey === 'eq') {
                        condition.equal = condition.eq;
                    } else if (conditionKey === 'bt') {
                        condition.between = condition.bt;
                    }
                }
            }
    
            if (expectedType === 'number') {
                if (condition.equal !== undefined && typeof condition.equal === 'number') {
                    docs = docs.filter(doc => doc[key] === condition.equal);
                }
            } else if (expectedType === 'boolean' && typeof condition !== 'boolean') {
                console.warn(`Expected a boolean for condition on field '${key}', but got ${typeof condition}`);
                return [];
            }
        }
    
        return docs.filter(doc => {
            for (const key in whereClause) {
                const condition = whereClause[key];
                const docValue = doc[key];
    
                if (typeof condition === 'object' && condition !== null) {
                    if (condition.between && Array.isArray(condition.between) && condition.between.length === 2) {
                        const [min, max] = condition.between;
                        if (docValue < min || docValue > max) {
                            return false;
                        }
                    } else if (condition.lessthan && docValue >= condition.lessthan) {
                        return false;
                    } else if (condition.greaterthan && docValue <= condition.greaterthan) {
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
        return calculateScore(doc, queryWords, this.fields, this.schema, this.#levenshteinDistance.bind(this), this.#sanitizeText.bind(this), this.#stemmer.bind(this));
    }

    #sanitizeText(text) {
        return textUtils.sanitizeText(text);
    }

    #stemmer(word) {
        return textUtils.stemmer(word);
    }

    #levenshteinDistance(a, b) {
        const cacheKey = `${a}:${b}`;
        if (this.levenshteinCache.has(cacheKey)) {
            return this.levenshteinCache.get(cacheKey);
        }

        const distance = textUtils.levenshteinDistance(a, b);
        this.levenshteinCache.set(cacheKey, distance);
        return distance;
    }
}