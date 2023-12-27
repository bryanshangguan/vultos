import * as textUtils from './textUtils.js';
import { stopWords } from './lists.js';

const LEVENSHTEIN_DISTANCE = 3;

export default function calculateScore(doc, queryWords, fields, schema, levenshteinDistance, ignoreFields) {
    let totalScore = 0;
    let totalMaxPossibleScore = 0;

    const processedQueryWords = queryWords.map(word => textUtils.stemmer(textUtils.sanitizeText(word)));
    const stopwordsSet = new Set(stopWords);

    for (const field of fields) {
        if (ignoreFields && ignoreFields.includes(field.name)) {
            continue;
        }

        if (doc[field.name] !== undefined && schema[field.name] === 'string') {
            const fieldType = schema[field.name];
            const fieldContent = doc[field.name];
            const fieldWeight = field.weight || 1;
            let fieldScore = 0;
            let fieldMaxPossibleScore = fieldWeight * 5;

            if (fieldType === 'string') {
                const sanitizedFieldContent = textUtils.sanitizeText(fieldContent);
                const fieldContentWords = sanitizedFieldContent.split(/\s+/).map(word => textUtils.stemmer(word));
                const fieldContentSet = new Set(fieldContentWords.filter(word => !stopwordsSet.has(word)));

                if (processedQueryWords.length > 1) {
                    fieldScore += calculatePhraseScore(sanitizedFieldContent, processedQueryWords, fieldWeight, levenshteinDistance);
                }
                fieldScore += calculateWordScore(fieldContentSet, processedQueryWords, fieldWeight, levenshteinDistance);
            } else if (fieldType === 'number') {
                fieldScore += calculateNumberScore(fieldContent, processedQueryWords, fieldWeight);
            } else if (fieldType === 'boolean') {
                fieldScore += calculateBooleanScore(fieldContent, processedQueryWords, fieldWeight);
            }

            totalScore += (fieldMaxPossibleScore > 0) ? (fieldScore / fieldMaxPossibleScore) * fieldWeight * 5 : 0;
            totalMaxPossibleScore += fieldMaxPossibleScore;
        }
    }

    return totalMaxPossibleScore > 0 ? Math.min(totalScore / totalMaxPossibleScore, 1) : 0;
}

function calculatePhraseScore(fieldContent, queryWords, fieldWeight, levenshteinDistance) {
    let score = 0;
    const fullQuery = textUtils.sanitizeText(queryWords.join(' '));

    for (let i = 0; i <= fieldContent.length - fullQuery.length;) {
        const substring = fieldContent.substring(i, i + fullQuery.length);
        const distance = levenshteinDistance(fullQuery, substring);
        if (distance < LEVENSHTEIN_DISTANCE) {
            score += fieldWeight * 5 / (distance + 1);
            i += fullQuery.length;
        } else {
            i++;
        }
    }

    return score;
}

function calculateWordScore(fieldContent, queryWords, fieldWeight, levenshteinDistance) {
    let score = 0;
    const totalFieldWords = fieldContent.size;
    let matchedWords = 0;

    for (const word of queryWords) {
        if (fieldContent.has(word)) {
            matchedWords++;
        } else {
            for (const fieldWord of fieldContent) {
                const distance = levenshteinDistance(word, fieldWord);
                if (distance < LEVENSHTEIN_DISTANCE) {
                    matchedWords++;
                    break;
                }
            }
        }
    }

    if (totalFieldWords > 0) {
        const matchProportion = matchedWords / totalFieldWords;
        score = fieldWeight * 5 * matchProportion;
    }

    return score;
}


function calculateNumberScore(fieldContent, queryWords, fieldWeight) {
    let score = 0;
    queryWords.forEach(queryWord => {
        if (!isNaN(queryWord) && Number(queryWord) === fieldContent) {
            score += fieldWeight;
        }
    });
    return score;
}

function calculateBooleanScore(fieldContent, queryWords, fieldWeight) {
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