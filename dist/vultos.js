import Field from './field.js';
import calculateScore from './score.js';
import * as textUtils from './textUtils.js';

const BATCH_SIZE = 100;
const LEVENSHTEIN_DISTANCE = 2;

export default class Vultos {
    constructor(config) {
        const configKeys = Object.keys(config);
        if (configKeys.length !== 1 || !config.hasOwnProperty('schema')) {
            throw new Error('Invalid configuration: Expected only a "schema" property.');
        }
        this.schema = config.schema;
        this.index = new Map();

        this.cache = new Map();
        this.levenshteinCache = new Map();
        this.sanitizeTextCache = new Map();
        this.stemmerCache = new Map();

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
            throw new Error('Document does not match schema:', doc);
        }
    }

    addDocs(docsArray) {
        for (let i = 0; i < docsArray.length; i += BATCH_SIZE) {
            const batch = docsArray.slice(i, i + BATCH_SIZE);
            this.#processBatch(batch);
        }
    }

    removeDoc(docToRemove) {
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
    }

    removeDocs(arg) {
        if (!arg) {
            throw new Error('No argument provided. Please provide an array of documents or a where clause.');
        }

        let documentsToRemove = [];

        if (Array.isArray(arg)) {
            documentsToRemove = arg;
        } else if (typeof arg === 'object' && arg.where) {
            documentsToRemove = this.#applyWhereClause(this.docs, arg.where);
        } else {
            throw new Error('Invalid argument. Please provide either an array of documents or a where clause object.');
        }

        if (documentsToRemove.length === 0) {
            return;
        }

        console.log("Removing", documentsToRemove.length, "documents");

        for (let i = 0; i < documentsToRemove.length; i += BATCH_SIZE) {
            const batch = documentsToRemove.slice(i, i + BATCH_SIZE);
            this.#processRemovalBatch(batch);
        }

        return documentsToRemove.length;
    }

    search(query, parameters = {}) {
        const startTime = performance.now();

        console.time("parameters");
        this.#handleParameters(parameters);
        console.timeLog("parameters");

        console.time("caching");
        const cacheKey = this.#createCacheKey(query, parameters);
        if (this.cache.has(cacheKey)) {
            const cachedResults = this.cache.get(cacheKey);
            return this.#formatSearchResults(cachedResults, parameters, startTime);
        }
        console.timeLog("caching");

        console.time("relevantDocs");
        const queryWords = query.toLowerCase().split(/\s+/).map(word => this.#stemmer(this.#sanitizeText(word)));
        let relevantDocs = this.#findRelevantDocs(queryWords);
        console.timeLog("relevantDocs");

        console.time("filtering");
        let filteredDocs = this.#filterDocs(relevantDocs, parameters.where);
        console.timeLog("filtering");
        console.time("score");
        let scoredDocs = this.#scoreAndSortDocs(filteredDocs, query, parameters.ignore);
        console.timeLog("score");

        console.time("unique");
        let hits = this.#uniqueDocuments(scoredDocs);
        this.cache.set(cacheKey, hits);
        console.timeLog("unique");

        return this.#formatSearchResults(hits, parameters, startTime);
    }

    #findRelevantDocs(queryWords) {
        let relevantDocs = new Set();
        queryWords.forEach(queryWord => {
            this.index.forEach((docsSet, indexedWord) => {
                if (this.#isWordRelevant(queryWord, indexedWord)) {
                    docsSet.forEach(doc => relevantDocs.add(doc));
                }
            });
        });
        return relevantDocs;
    }

    #isWordRelevant(queryWord, indexedWord) {
        if (Math.abs(queryWord.length - indexedWord.length) >= LEVENSHTEIN_DISTANCE) return false;
        const distance = this.#levenshteinDistance(queryWord, indexedWord);
        return distance < LEVENSHTEIN_DISTANCE;
    }

    #filterDocs(docs, whereClause) {
        if (!whereClause) return Array.from(docs);
        return this.#applyWhereClause(Array.from(docs), whereClause);
    }

    #scoreAndSortDocs(docs, queryWords, ignoreFields) {
        if (!Array.isArray(docs)) {
            console.error('Expected an array of documents for scoring and sorting');
            return [];
        }
        return docs.map(doc => ({
            doc,
            score: this.#calculateScore(doc, queryWords, ignoreFields)
        }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score);
    }

    #uniqueDocuments(scoredDocs) {
        let uniqueDocs = new Set();
        let hits = [];
        scoredDocs.forEach(item => {
            const docStr = JSON.stringify(item.doc);
            if (!uniqueDocs.has(docStr)) {
                uniqueDocs.add(docStr);
                hits.push({ score: item.score, document: item.doc });
            }
        });
        return hits;
    }

    #formatSearchResults(hits, parameters, startTime) {
        hits = this.#filterHitsByScore(hits, parameters.score);
        const endTime = performance.now();
        return {
            elapsed: endTime - startTime,
            count: hits.length,
            hits: hits,
            sortBy: (fieldName) => this.#sortByField(hits, fieldName)
        };
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
                throw new Error('Document does not match schema:', doc);
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
            const validKeys = ['fields', 'where', 'score', 'ignore'];
            for (const key in parameters) {
                if (!validKeys.includes(key)) {
                    throw new Error(`Unexpected parameter key '${key}'. Expected keys are ${validKeys.join(', ')}`);
                }
            }

            if (parameters.fields) {
                for (const fieldName in parameters.fields) {
                    if (!this.schema.hasOwnProperty(fieldName)) {
                        throw new Error(`Field '${fieldName}' is not in the schema.`);
                    }
                }
            }

            if (parameters.ignore && !Array.isArray(parameters.ignore)) {
                throw new Error(`'ignore' parameter must be an array of field names.`);
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
            const validConditionKeys = ['lt', 'lte', 'gt', 'gte', 'bt', 'eq', 'inc'];

            if (typeof condition === 'object' && condition !== null) {
                for (const conditionKey in condition) {
                    if (!validConditionKeys.includes(conditionKey)) {
                        throw new Error(`Unrecognized condition '${conditionKey}' on field '${key}'`);
                    }
                }
            }

            if (expectedType === 'number') {
                if (condition.eq !== undefined && typeof condition.eq === 'number') {
                    docs = docs.filter(doc => doc[key] === condition.eq);
                }
            } else if (expectedType === 'string') {
                if (condition.eq !== undefined && typeof condition.eq === 'string') {
                    docs = docs.filter(doc => doc[key] === condition.eq);
                }
                if (condition.inc !== undefined && typeof condition.inc === 'string') {
                    docs = docs.filter(doc => doc[key].includes(condition.inc));
                }
            } else if (expectedType === 'boolean' && typeof condition !== 'boolean') {
                throw new Error(`Expected a boolean for condition on field '${key}', but got ${typeof condition}`);
            }
        }

        return docs.filter(doc => {
            for (const key in whereClause) {
                const condition = whereClause[key];
                const docValue = doc[key];

                if (typeof condition === 'object' && condition !== null) {
                    if (condition.bt && Array.isArray(condition.bt) && condition.bt.length === 2) {
                        const [min, max] = condition.bt;
                        if (docValue < min || docValue > max) {
                            return false;
                        }
                    } else if (condition.lt && docValue >= condition.lt) {
                        return false;
                    } else if (condition.lte && docValue > condition.lte) {
                        return false;
                    } else if (condition.gt && docValue <= condition.gt) {
                        return false;
                    } else if (condition.gte && docValue < condition.gte) {
                        return false;
                    }
                }
            }
            return true;
        });
    }

    #filterHitsByScore(hits, scoreConditions) {
        if (!scoreConditions) return hits;

        const validScoreKeys = ['gt', 'lt', 'eq'];
        for (const key in scoreConditions) {
            if (!validScoreKeys.includes(key)) {
                throw new Error(`Invalid score condition '${key}'. Expected conditions are 'gt', 'lt', and 'eq'`);
            }

            const score = scoreConditions[key];
            if (score <= 0 || score >= 1) {
                throw new Error(`Invalid score value '${score}'. Score must be between 0 and 1.`);
            }
        }

        return hits.filter(hit => {
            if (scoreConditions.gt !== undefined && hit.score <= scoreConditions.gt) {
                return false;
            }
            if (scoreConditions.lt !== undefined && hit.score >= scoreConditions.lt) {
                return false;
            }
            if (scoreConditions.eq !== undefined && hit.score !== scoreConditions.eq) {
                return false;
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
                if (!this.schema.hasOwnProperty(fieldName)) {
                    throw new Error(`Field '${fieldName}' is not in the schema.`);
                }

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

    #calculateScore(doc, queryWords, ignoreFields = []) {
        if (ignoreFields && Array.isArray(ignoreFields)) {
            const filteredFields = this.fields.filter(field => !ignoreFields.includes(field.name));
            return calculateScore(doc, queryWords, filteredFields, this.schema, this.#levenshteinDistance.bind(this));
        } else {
            return calculateScore(doc, queryWords, this.fields, this.schema, this.#levenshteinDistance.bind(this));
        }
    }

    #sanitizeText(text) {
        if (this.sanitizeTextCache.has(text)) {
            return this.sanitizeTextCache.get(text);
        }
        const sanitizedText = textUtils.sanitizeText(text);
        this.sanitizeTextCache.set(text, sanitizedText);
        return sanitizedText;
    }

    #stemmer(word) {
        if (this.stemmerCache.has(word)) {
            return this.stemmerCache.get(word);
        }
        const stemmedWord = textUtils.stemmer(word);
        this.stemmerCache.set(word, stemmedWord);
        return stemmedWord;
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