import * as textUtils from './textUtils.js';
import { stopWords } from './lists.js';

const LEVENSHTEIN_DISTANCE = 2;
const stopWordsSet = new Set(stopWords);
const processedWordsCache = new Map();

export default function calculateScore(doc, queryWords, fields, schema, levenshteinDistance, ignoreFields) {
    let totalWeight = 0;
    let totalScore = 0;

    const processedQuery = processText(queryWords);
    const queryWordsArray = processedQuery.split(/\s+/);

    for (const field of fields) {
        if (ignoreFields && ignoreFields.includes(field.name) || doc[field.name] === undefined) {
            continue;
        }

        const fieldWeight = field.weight || 1;
        totalWeight += fieldWeight;

        let fieldScore = 0;
        const processedFieldContent = processText(doc[field.name].toString());

        if (schema[field.name] === 'string') {
            fieldScore = calculatePhraseScore(processedFieldContent, processedQuery, queryWordsArray, levenshteinDistance);
        } else if (schema[field.name] === 'number') {
            fieldScore = calculateNumberScore(processedFieldContent, queryWordsArray);
        }

        totalScore += fieldScore * fieldWeight;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
}

function processText(text) {
    return text.split(/\s+/)
        .map(word => {
            if (!processedWordsCache.has(word)) {
                const processed = textUtils.stemmer(textUtils.sanitizeText(word));
                if (!stopWordsSet.has(processed)) {
                    processedWordsCache.set(word, processed);
                } else {
                    processedWordsCache.set(word, null);
                }
            }
            return processedWordsCache.get(word);
        })
        .filter(Boolean)
        .join(' ');
}

function calculatePhraseScore(fieldContent, processedQuery, queryWordsArray, levenshteinDistance) {
    if (fieldContent === processedQuery) {
        return 1;
    } else {
        const fieldContentWords = new Set(fieldContent.split(/\s+/));
        return calculateWordScore(fieldContentWords, queryWordsArray, levenshteinDistance);
    }
}

function calculateWordScore(fieldContentWords, queryWords, levenshteinDistance) {
    let matchedWords = 0;

    for (const word of queryWords) {
        if (fieldContentWords.has(word)) {
            matchedWords++;
        } else {
            for (const fieldWord of fieldContentWords) {
                if (Math.abs(word.length - fieldWord.length) < LEVENSHTEIN_DISTANCE) {
                    const distance = levenshteinDistance(word, fieldWord);
                    if (distance < LEVENSHTEIN_DISTANCE) {
                        matchedWords++;
                        break;
                    }
                }
            }
        }
    }

    return queryWords.length > 0 ? matchedWords / fieldContentWords.size : 0;
}

function calculateNumberScore(fieldContent, queryWords) {
    for (const queryWord of queryWords) {
        if (!isNaN(queryWord) && Number(queryWord) === fieldContent) {
            return 1;
        }
    }
    return 0;
}