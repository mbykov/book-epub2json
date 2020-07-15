import { epub2json } from "./index";
const path = require("path")
const log = console.log
// const fse = require('fs-extra')

let export2dgl = process.argv.slice(2)[0] || false

let bpath
bpath = '../test/Being_Different.epub'
// bpath = '../test/minimal-v2.epub'
// bpath = '../test/phoenix-ru.epub'
bpath = '../test/phoenix-en.epub'
// bpath = '../test/Moby-Dick-backwards-nav.epub'
// bpath = '../test/pg2701.epub'

bpath = path.resolve(__dirname, bpath)
log('RUN: BPATH', bpath)

epub2json(bpath, export2dgl)
  .then(res=> {
    if (!res) return
    if (!res.docs) return
    log('__RES', res.descr, res.docs.length)
    log('__DOCS', res.docs.slice(100, 111))

    log(res.docs.slice(-10))
    res.docs.forEach(doc=> {
      if (doc.level > -1) log('_title:', doc)
    })
  })
