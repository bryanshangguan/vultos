# Highlighted features
 - Full-text search with customizable weighting and scoring.
 - Boolean and numeric range queries.
 - Extensible schema definition for varied data types.
 - Performance optimizations with indexing, caching and efficient querying.

# Installation
There are two ways to install Vultos and start using it in your project:

1. Using `npm` (Node.js):
   - Open a terminal in your project directory.
   - Run the following command:

```sh
npm i vultos
```
2. Directly in a browser module (without Node.js):

```html
<script type="module" src="https://unpkg.com/vultos@latest/dist/vultos.js"></script>
```

# Initialization
### Defining Your Data Structure: Initialization with Schema
Vultos thrives on understanding your data, and that starts with the schema you define during initialization. The schema tells Vultos what kind of information to expect in your documents, allowing it to efficiently store, search, and retrieve relevant data for your needs.

### Supported Data Types:
Currently, Vultos supports three basic data types for your document fields:
 - String: Text information like titles, descriptions, or names.
 - Number: Numeric values like years, counts, or measurements.
 - Boolean: True or false values for binary states like availability or completion.

### Example Schema:

```js
const vultos = new Vultos({
    schema: {
        title: 'string',
        author: 'string',
        year: 'number',
        isAvailable: 'boolean'
        // other fields...
    }
});
```

### In this schema:
 - Each field name, like title or year, becomes a key in your documents.
 - The corresponding data type indicates what kind of value you expect for each field.
 - You can define as many fields as needed to accurately represent your data.

# Adding and removing documents
Once you have your schema defined, you can start adding documents to your Vultos instance. Remember, each document must adhere to the defined schema:

```js
vultos.addDoc({
    title: 'Example Title',
    author: 'Example Author',
    year: 2000,
    isAvailable: false
});
```
Important Note:

Adding fields to your documents that weren't defined in the schema will result in validation errors. Ensure your data structure and schema align for smooth operation.

### Adding multiple documents
Alternatively you can add multiple docs at the same time. Remember, each and every document added to your Vultos instance must adhere to the predefined schema.

```js
vultos.addDocs([{
        "title": "Title One",
        "author": "Author One",
        "year": 1800,
        "isAvailable": false,
    },
    {
        "title": "Title Two",
        "author": "Author Two",
        "year": 2010,
        "isAvailable": true,
}]);
```

# Removing documents
Just like organizing your bookshelf, managing your data sometimes requires removing documents that are no longer needed or relevant. Vultos offers two handy methods for this task:
 - `removeDoc(document)`: Removes a single document from your Vultos instance.
 - `removeDocs(documentArray)`: Removes multiple documents from your Vultos instance in one go.

 Important Note: Both methods require an exact match with the document you want to remove. This means the complete content and structure of the document you provide must be identical to the existing one in your Vultos instance for the removal to be successful.

Remember:
 - Removing a document is permanent and cannot be undone.
 - Make sure you're confident about removing the desired documents before proceeding.

 ```js
vultos.removeDoc({
    title: 'Example Title',
    author: 'Example Author',
    year: 2000,
    isAvailable: false
});
```

```js
vultos.removeDocs([{
        "title": "Title One",
        "author": "Author One",
        "year": 1800,
        "isAvailable": false,
    },
    {
        "title": "Title Two",
        "author": "Author Two",
        "year": 2010,
        "isAvailable": true,
}]);
```

# Searching
Searching is as simple calling the search method with a specified query.

```js
const results = vultos.search('search query');
```

# Search configuration
The configuration allows for more precise querying. Certain fields can be weighted differently from 1-5 with the default being 1 for each unspecified field. The higher the weight, the more "important" a field is considered in your search.

```js
const searchResults = vultos.search('search query', {
    fields: {
        title: { weight: 5 },
        author: { weight: 3 }
    }}
});
```

### Where clause
Need to narrow your search further? The `where` clause lets you define specific conditions for the data you're looking for. It supports various types of comparisons across numeric, boolean, and date fields.

Numeric Range Queries:
 - `between`: This keyword is used to find documents where a numeric field falls within a specific range (inclusive).
    ```js
    const searchResults = vultos.search('historical fiction', {
      where: {
        year: { between: [1700, 1900] },
      }
    });
    ```
 - `before`: This keyword finds documents where a numeric field is less than a specific value.
    ```js
    const searchResults = vultos.search('old novels', {
      where: {
        year: { before: 1960 },
      }
    });
    ```
 - `after`: This keyword finds documents where a numeric field is greater than a specific value.
  
    ```js
    const searchResults = vultos.search('upcoming releases', {
      where: {
        publicationDate: { after: 2023 },
      }
    });
    ```
Boolean Comparisons:
  - You can use simple true and false values to match or exclude documents based on boolean fields.
    ```js
    const searchResults = vultos.search('available books', {
      where: {
        isAvailable: true,
      }
    });
    ```

### Sorting results
 - Sorting Capability: With the `sortBy` method, users can now sort their search results alphabetically based on a specified string field.
 - Field Restriction: The `sortBy` function is designed to work with fields that are designated as strings in the schema.

After performing a search, users can chain the `sortBy` method to their search query. The method takes a string field name as an argument.

```js
const searchResults = vultos.search('search query', {
    fields: {
        title: { weight: 5 },
        author: { weight: 1 }
    },
    where: {
        year: { after: 1900 }
    }
}).sortBy("title");
```
Important considerations:
 - Field Validation: `sortBy` only accepts fields that are designated as strings in the Vultos schema.
 - Error Handling: Attempting to sort by a non-string field or a field not present in the schema will result in an error.

# Search results
This section explains the format of the search results returned by Vultos, helping you understand the information provided for each hit.
 - `elapsed`: This field holds the time taken to complete the search in milliseconds. It can be valuable for gauging performance and optimizing your queries.
 - `count`: This field indicates the total number of documents matching your search query. It's helpful to know how many relevant results the search process identified.
 - `hits`: This is an array of individual search results, where each element represents a matched document. Each hit object contains:
   - `score`: This field holds the relevance score of the document for your query. Higher scores indicate a closer match to your search terms. Vultos uses a custom scoring algorithm considering factors like term frequency, field weights, and document length.
   - `document`: This object contains the full data of the matching document. It will reflect the same structure as the data you added through addDoc, including all defined fields and their values. This allows you to directly access the retrieved information.

```json
{
  "elapsed": 8.7,
  "count": 2,
  "hits": [
    {
      "score": 0.5555555555555556,
      "document": {
        "title": "The Great Gatsby",
        "author": "F. Scott Fitzgerald",
        "keywords": "american dream, jazz age, decadence, obsession, wealth, parties, long island, illusion vs reality, moral decay, unrequited love",
        "isAvailable": true,
        "year": 1925
      }
    },
    {
      "score": 0.2,
      "document": {
        "title": "Tarzan of the Apes",
        "author": "Edgar Rice Burroughs",
        "keywords": "jungle, wilderness, adventure, civilization vs nature, survival, identity, man vs beast, discovery, adaptation, isolation",
        "isAvailable": true,
        "year": 1912
      }
    }
  ]
}
```

Additional notes:
 - The isAvailable and year fields in the example may differ depending on your actual schema defined during Vultos initialization.
 - Remember, the returned document object always reflects the original data you added, excluding any temporary processing information like stemmed words or internal identifiers.

License
Vultos is licensed under the MIT License.