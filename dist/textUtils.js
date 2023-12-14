import * as lists from './lists.js';

function sanitizeText(text) {
    if (typeof text === 'string') {
        return text.toLowerCase().replace(/[^\w\s]/gi, '');
    }
    return text;
}

function stemmer(word) {
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

    const step2and3list = lists.list_2_3;
    const step4list = lists.list_4;

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

function levenshteinDistance(a, b) {
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
    return result;
}

export { sanitizeText, stemmer, levenshteinDistance };