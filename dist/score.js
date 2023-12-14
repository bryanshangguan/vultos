export default function calculateScore(doc, queryWords, fields, schema, levenshteinDistance, sanitizeText, stemmer) {
    let score = 0;
    let maxPossibleScore = 0;

    for (const field of fields) {
        if (doc[field.name] !== undefined) {
            const fieldType = schema[field.name];
            const fieldContent = doc[field.name];
            const fieldWeight = field.weight || 1;
            maxPossibleScore += fieldWeight * 5;

            if (fieldType === 'string') {
                const sanitizedFieldContent = sanitizeText(fieldContent);
                if (queryWords.length > 1) {
                    score += calculatePhraseScore(sanitizedFieldContent, queryWords, fieldWeight, levenshteinDistance, sanitizeText);
                }
                score += calculateWordScore(sanitizedFieldContent, queryWords, fieldWeight, levenshteinDistance, stemmer, sanitizeText);
            } else if (fieldType === 'number') {
                score += calculateNumberScore(fieldContent, queryWords, fieldWeight);
            } else if (fieldType === 'boolean') {
                score += calculateBooleanScore(fieldContent, queryWords, fieldWeight);
            }
        }
    }

    return maxPossibleScore > 0 ? Math.min(score / maxPossibleScore, 1) : 0;
}

function calculatePhraseScore(fieldContent, queryWords, fieldWeight, levenshteinDistance, sanitizeText) {
    let score = 0;
    const fullQuery = sanitizeText(queryWords.join(' '));
    const someThreshold = 3;

    for (let i = 0; i <= fieldContent.length - fullQuery.length;) {
        const substring = fieldContent.substring(i, i + fullQuery.length);
        const distance = levenshteinDistance(fullQuery, substring);
        if (distance < someThreshold) {
            score += fieldWeight * 5 / (distance + 1);
            i += fullQuery.length;
        } else {
            i++;
        }
    }

    return score;
}

function calculateWordScore(fieldContent, queryWords, fieldWeight, levenshteinDistance, stemmer, sanitizeText) {
    let score = 0;
    const sanitizedQueryWords = queryWords.map(word => stemmer(sanitizeText(word)));
    const fieldContentWords = fieldContent.split(/\s+/).map(word => stemmer(word));

    for (const word of sanitizedQueryWords) {
        for (const fieldWord of fieldContentWords) {
            const distance = levenshteinDistance(word, fieldWord);
            if (distance < 3) {
                score += fieldWeight / (distance + 1);
            }
        }
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