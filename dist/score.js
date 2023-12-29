import * as textUtils from './textUtils.js';
import { stopWords } from './lists.js';

const LEVENSHTEIN_DISTANCE = 3;
const stopWordsSet = new Set(stopWords);

export default function calculateScore(doc, queryWords, fields, schema, levenshteinDistance, ignoreFields) {
    let totalWeight = 0;
    let totalScore = 0;

    const processedQuery = processText(queryWords);

    for (const field of fields) {
        if (ignoreFields && ignoreFields.includes(field.name)) {
            continue;
        }

        const fieldWeight = field.weight || 1;
        totalWeight += fieldWeight;

        if (doc[field.name] !== undefined) {
            let fieldScore = 0;
            const processedFieldContent = processText(doc[field.name].toString());

            if (schema[field.name] === 'string') {
                fieldScore = calculatePhraseScore(processedFieldContent, processedQuery, levenshteinDistance);
            } else if (schema[field.name] === 'number') {
                fieldScore = calculateNumberScore(processedFieldContent, processedQuery.split(/\s+/));
            }

            totalScore += fieldScore * fieldWeight;
        }
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
}

function processText(text) {
    return textUtils.sanitizeText(text)
        .split(/\s+/)
        .map(word => textUtils.stemmer(word))
        .filter(word => !stopWordsSet.has(word))
        .join(' ');
}

function calculatePhraseScore(fieldContent, processedQuery, levenshteinDistance) {
    if (fieldContent === processedQuery) {
        return 1;
    } else {
        const fieldContentWords = new Set(fieldContent.split(/\s+/));
        const queryWords = processedQuery.split(/\s+/);
        return calculateWordScore(fieldContentWords, queryWords, levenshteinDistance);
    }
}

function calculateWordScore(fieldContent, queryWords, levenshteinDistance) {
    let matchedWords = 0;

    for (const word of queryWords) {
        if (fieldContent.has(word)) {
            matchedWords++;
        } else {
            for (const fieldWord of fieldContent) {
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

    return queryWords.length > 0 ? matchedWords / fieldContent.size : 0;
}

function calculateNumberScore(fieldContent, queryWords) {
    for (const queryWord of queryWords) {
        if (!isNaN(queryWord) && Number(queryWord) === fieldContent) {
            return 1;
        }
    }
    return 0;
}