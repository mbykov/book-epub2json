'use strict'

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
// bpath = '../test/alice.epub'
// bpath = '../test/pg928.epub'

bpath = path.resolve(__dirname, bpath)
log('RUN: BPATH', bpath)

epub2json(bpath, export2dgl)
  .then(res=> {
    if (!res || !res.mds) return
    log('__RES_descr:', res.descr)
    log('__RES_mds:', res.mds.length)
    log('__RES_imgs', res.imgs.length)

    log('__RES_docs-sclice:', res.mds.slice(150, 152))
    // log(res.docs.slice(-10))

    // res.docs = res.docs.slice(0,5)
    res.mds.forEach(md=> {
      if (md[0] == '#') log('_title:', md)
    })
  })

// epub2json_docs(bpath, export2dgl)
//   .then(res=> {
//     if (!res || !res.docs) return
//     log('__RES_descr:', res.descr)
//     log('__RES_docs:', res.docs.length)
//     log('__RES_imgs', res.imgs.length)

//     log('__RES_docs-sclice:', res.docs.slice(150, 155))
//     // log(res.docs.slice(-10))

//     // res.docs = res.docs.slice(0,5)
//     res.docs.forEach(doc=> {
//       if (doc.level > -1) log('_title:', doc)
//     })
//   })
