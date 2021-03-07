# book-epub2json

helper module for the **diglossa.js**: https://github.com/mbykov/diglossa.js.git

# Quick start

Make sure you have [Node.js](https://nodejs.org) installed, then type the following commands
```
git clone https://github.com/mbykov/book-epub2json.git
cd book-epub2json
yarn install
yarn start
```
...and you have a running example

## API

```json
import { epub2json } from "./index";
const path = require("path")
let bpath = test.epub'

async function start(bpath) {
  let {descr, docs, imgs} = await epub2json(bpath)
  log('_descr:', descr)
  log('_docs:', docs.length)
  log('_imgs', imgs.length)
}
```
## other helper modules for **diglossa.js**:

```json
- books:
- https://github.com/mbykov/book-epub2json
- https://github.com/mbykov/book-fb2json
- https://github.com/mbykov/book-md2json
- https://github.com/mbykov/book-pdf2json
-
- dicts:
- https://github.com/mbykov/dict-sd2json
- dict-dsl2json
```
