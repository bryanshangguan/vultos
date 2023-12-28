import * as lists from './lists.js';

const reEdIngLy = /(ed|edly|ing|ingly)$/;
const reAtBlIz = /(at|bl|iz)$/;
const reDoubleConsonant = /([^aeiouylsz])\1$/;
const reCvc = /[^aeiou][aeiouy][^aeiouwxy]$/;
const reEedEedly = /(eed|eedly)$/;
const reSsesIes = /(sses|ies)$/;
const reSingularS = /([^s])s$/;
const reEndY = /(y|Y)$/;

const regexDashUnderscore = /[-_]/g;
const regexNonWordSpace = /[^\w\s]/gi;

function sanitizeText(text) {
    if (typeof text === 'string') {
        return text.toLowerCase().replace(regexDashUnderscore, ' ').replace(regexNonWordSpace, '');
    }
    return text;
}

function stemmer(word) {
    word = word.replace(reSsesIes, "ss").replace(reSingularS, "$1");

    if (reEedEedly.test(word)) {
        word = word.replace(reEedEedly, "ee");
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

    word = word.replace(reEndY, "i");

    const step2and3list = lists.list_2_3;
    const step4list = lists.list_4;

    for (let [suffix, replacement] of Object.entries(step2and3list)) {
        if (word.endsWith(suffix)) {
            return word.replace(new RegExp(suffix + "$"), replacement);
        }
    }

    for (let suffix of step4list) {
        if (word.endsWith(suffix)) {
            return word.replace(new RegExp(suffix + "$"), "");
        }
    }

    return word.replace(/e$/, "").replace(/(ll)$/, "l");
}

function levenshteinDistance(a, b) {
    const currentRow = Array(b.length + 1);
    for (let i = 0; i <= b.length; i++) {
        currentRow[i] = i;
    }

    for (let i = 1; i <= a.length; i++) {
        const previousRow = currentRow.slice();
        currentRow[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const cost = (a[i - 1] === b[j - 1]) ? 0 : 1;
            currentRow[j] = Math.min(previousRow[j] + 1, currentRow[j - 1] + 1, previousRow[j - 1] + cost);
        }
    }

    return currentRow[b.length];
}

export { sanitizeText, stemmer, levenshteinDistance };