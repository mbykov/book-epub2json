'use strict'

import { epub2json } from "./index";
const log = console.log
const path = require("path")

// notes:
// v.2 - Popular-scientific-lectures.epub; gutenberg
// v.3 - нет хорошего примера, но есть описание про aside
//

let bpath = 'file-1.epub'
// bpath = 'file-1-no-toc.epub'
// bpath = 'file-e.epub'
// bpath = 'file-2.epub'

bpath = path.resolve(__dirname, '../test', bpath)

// bpath = 'Quick-Start-Guide.epub'
// bpath = 'aliceDynamic.epub'
// bpath = 'epub30-spec.epub'

// bpath = 'Braginskaya.epub'
bpath = 'Popular-scientific-lectures.epub'
bpath = 'Being_Different.epub'
bpath = 'astronomy.epub'
bpath = 'test.epub'
bpath = 'La peste - Albert Camus.epub'
bpath = path.resolve(__dirname, '../test/', bpath)

async function start(bpath, write) {
  log('_epub2json-bpath_', bpath)
  let {descr, docs, imgs} = await epub2json(bpath)
  // if (!docs) log('_ERR MESS', descr); return

  log('_descr:', descr)

  docs.forEach(doc=> {
    if (doc.level > -1) log('_level:', doc.level, doc.md.slice(0,35))
  })

  log('_docs: 100:', docs[100])
  log('_docs:', docs.length)
  log('_imgs', imgs.length)

  let fns = docs.filter(doc=> doc.footnote)
  let refs = docs.filter(doc=> doc.refnote)
  log('_fns:', fns.length)
  refs = refs.slice(0,2)
  log('_refs:', refs.length)

  let tmps = refs.slice(0,2)
  tmps.forEach(doc=> {
    // if (doc.level) log('_title:', doc)
    log('_d', doc)
  })


  // if (write) {
  //   log('___WRITING', bpath)
  //   // writeFiles(bpath, descr, mds)
  // } else {
  //   return {descr, docs, imgs}
  // }
}

start(bpath)
