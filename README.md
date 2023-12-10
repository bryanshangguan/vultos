Vultus Library Documentation
<p align="center">
  <img src="/misc/readme/orama-readme_logo-dark.png#gh-dark-mode-only" />
  <img src="/misc/readme/orama-readme_logo-light.png#gh-light-mode-only" />
</p>
<br />
<p align="center">
  Introducing Vultus, a powerful and flexible search library that provides robust full-text capabilities.
</p>
<br />

Vultus offers a wide range of features, including:

Full-text search with customizable weighting and scoring.
Boolean and numeric range queries.
Extensible schema definition for varied data types.
Performance optimizations with caching and efficient querying.
Installation

<script type="module">
  import Vultus from './path/to/vultus.js'
</script>
Usage
To use Vultus in your project, start by creating a new instance with a defined schema:

js
Copy code
import Vultus from '@orama/orama';

const vultus = new Vultus({
    schema: {
        title: 'string',
        author: 'string',
        // other fields...
    }
});
Add documents to your Vultus instance:

vultus.addDoc({
    title: 'Example Title',
    author: 'Author Name',
    // other fields...
});

Perform a search:
const results = vultus.search('search term');

Advanced Search Capabilities
Vultus provides advanced search functionalities such as:

Weighted fields for prioritizing certain document properties.
Range queries for numeric and boolean data types.
Customizable scoring mechanisms for more refined search results.

const searchResults = vultus.search('search term', {
    fields: {
        title: { weight: 5 },
        author: { weight: 3 }
    },
    where: {
        isNew: true,
        year: { between: [1900, 2000] }
    }
});

License
Vultus is licensed under the MIT License.