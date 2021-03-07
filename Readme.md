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
import { epub2json } from "./epub2json"
let bpath = test.epub'

async function start(bpath) {
  let {descr, docs, imgs} = await epub2json(bpath)
  console.log('_descr:', descr)
  console.log('_docs:', docs.length)
  console.log('_imgs:', imgs.length)
}
```
Note: no errors, don't know why Github highlights some code in red

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
