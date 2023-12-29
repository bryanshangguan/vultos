import Vultos from '../dist/vultos.js';

const originalDocsOutput = document.getElementById('originalDocs');
const searchResultsOutput = document.getElementById('searchResults');
const searchBar = document.getElementById('searchBar');

const textbookURL = 'https://raw.githubusercontent.com/benoitvallon/100-best-books/master/books.json';
const bookUrl = './books.json';

const textbookSchema = {
    schema: {
        author: 'string',
        country: 'string',
        imageLink: 'string',
        language: 'string',
        link: 'string',
        pages: 'number',
        title: 'string',
        year: 'number'
    }
};

const bookSchema = {
    schema: {
        title: 'string',
        author: 'string',
        genre: 'string',
        published: 'number',
        keywords: 'string',
        description: 'string'
    }
};

const vultos = new Vultos(textbookSchema);
const query = "tales";

init();

async function init() {
    try {
        const response = await fetch(textbookURL);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const docs = await response.json();

        vultos.addDocs(docs);
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
    }

    updateDisplay();
    search(query);
    searchBar.value = query;
}

function updateDisplay() {
    originalDocsOutput.textContent = JSON.stringify(vultos.docs, null, 2);
}

searchBar.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const searchQuery = searchBar.value;

        search(searchQuery);
    }
});

function search(searchQuery) {
    const searchResults = vultos.search(searchQuery, {
        fields: {
            title: { weight: 5 }
        }
    });

    searchResultsOutput.textContent = JSON.stringify(searchResults, null, 2);
}
