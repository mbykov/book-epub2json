import { epub2json } from "./index";
const path = require("path")
const log = console.log
// const fse = require('fs-extra')

let bpath

bpath = '../test/Being_Different.epub'
bpath = '../test/minimal-v2.epub'

bpath = path.resolve(__dirname, bpath)
log('RUN: BPATH', bpath)

epub2json(bpath)
  .then(res=> {
    // if (!res) return
    // log('__RES', res)

    return

    if (!res.docs) return
    log(res.docs.slice(-1))
    log('_docs', res.docs.length)
    res.docs.forEach(doc=> {
      if (doc.level > -1) log('_title:', doc)
    })
  })
