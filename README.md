<h1>Documentation</h1>
<h4>
  Introducing Vultos, a powerful and flexible (fuzzy) search library that provides robust full-text capabilities.
</h4>
<br>
<h3>Vultos offers a wide range of features, including:</h3>
<ul>
    <li>Full-text search with customizable weighting and scoring.</li>
    <li>Boolean and numeric range queries.</li>
    <li>Extensible schema definition for varied data types.</li>
    <li>Performance optimizations with caching and efficient querying.</li>
</ul>

<h3>Installation</h3>

```js
import Vultos from './path/to/vultos.js'
```

<h3>Usage</h3>
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

<h3>Add documents to your Vultos instance:</h3>

```js
vultos.addDoc({
    title: 'Example Title',
    author: 'Author Name',
    // other fields...
});
```

<h3>Perform a search:</h3>

```js
const results = vultos.search('search term');
```

<h3>Advanced Search Capabilities</h3>
<p>Vultos provides advanced search functionalities such as:</p>
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