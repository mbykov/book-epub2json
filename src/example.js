'use strict'

import { epub2md } from "./index";
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
bpath = 'astronomy.epub'

// bpath = 'The_Hindus.epub' // FAIL ========= вообще все v.?
// bpath = 'The_Myth_of_Sisyphus.epub'

bpath = path.resolve(__dirname, '../../epub-samples', bpath)

async function start(bpath, write) {
  log('_epub2md-bpath_', bpath)
  let {descr, docs, imgs} = await epub2md(bpath)
  // if (!mds) log('_ERR MESS', descr); return

  log('_descr:', descr)
  log('_docs:', docs.length)
  log('_imgs', imgs.length)
  // log('_slice', mds.slice(-10))

  return

  // mds = mds.slice(0,5)
  mds.forEach(md=> {
    if (md[0] == '#') log('_title:', md)
  })
  if (write) {
    log('___WRITING', bpath)
    // writeFiles(bpath, descr, mds)
  } else {
    return {descr, mds, imgs}
  }
}

start(bpath)

// console.log("\n\nHas index been transpiled?\n" + xdxf());
