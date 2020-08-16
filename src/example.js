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

// fns - FAILED

// bpath = 'Quick-Start-Guide.epub'
// bpath = 'aliceDynamic.epub'
// bpath = 'epub30-spec.epub'

// == fns
bpath = 'Popular-scientific-lectures.epub'
bpath = 'Being_Different.epub'
// bpath = 'astronomy.epub'
bpath = 'Braginskaya.epub'

// bpath = 'The_Hindus.epub' // FAIL ========= вообще все v.?
// bpath = 'The_Myth_of_Sisyphus.epub'

bpath = path.resolve(__dirname, '../../epub-samples', bpath)

async function start(bpath, write) {
  log('_epub2json-bpath_', bpath)
  let {descr, docs, imgs} = await epub2json(bpath)
  // if (!docs) log('_ERR MESS', descr); return

  log('_descr:', descr)

  docs.forEach(doc=> {
    if (doc.level > -1) log('_level:', doc.level, doc.md.slice(0,25), doc.size)
  })

  log('_docs:', docs.length)
  log('_imgs', imgs.length)

  let fns = docs.filter(doc=> doc.footnote)
  let refs = docs.filter(doc=> doc.refnote)
  log('_fns:', fns.length)
  log('_refs:', refs.length)

  // if (write) {
  //   log('___WRITING', bpath)
  //   // writeFiles(bpath, descr, mds)
  // } else {
  //   return {descr, docs, imgs}
  // }
}

start(bpath)
