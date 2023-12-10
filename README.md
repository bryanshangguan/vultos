# Documentation
Introducing Vultos, a powerful and flexible (fuzzy) search library that provides robust full-text capabilities.

# Highlighted features
<ul>
    <li>Full-text search with customizable weighting and scoring.</li>
    <li>Boolean and numeric range queries.</li>
    <li>Extensible schema definition for varied data types.</li>
    <li>Performance optimizations with caching and efficient querying.</li>
</ul>

# Installation
You can install Vultos using `npm`

```sh
npm i vultos
```

```js
import Vultos from 'vultos'
```

# Intialization
To use Vultus in your project, start by creating a new instance with a defined schema:

```js
const vultos = new Vultos({
    schema: {
        title: 'string',
        author: 'string',
        // other fields...
    }
});
```

# Adding documents

```js
vultos.addDoc({
    title: 'Example Title',
    author: 'Author Name',
    // other fields...
});
```

# Searching

```js
const results = vultos.search('search term');
```

# Advanced search
Vultos provides advanced search functionalities such as:

<ul>
    <li>Weighted fields for prioritizing certain document properties.</li>
    <li>Range queries for numeric and boolean data types.</li>
    <li>Customizable scoring mechanisms for more refined search results.</li>
</ul>

```js
const searchResults = vultos.search('search term', {
    fields: {
        title: { weight: 5 },
        author: { weight: 3 }
    },
    where: {
        isNew: true,
        year: { between: [1900, 2000] }
    }
});
```

License
Vultos is licensed under the MIT License.