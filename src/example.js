'use strict'

import { epub2md } from "./index";
const path = require("path")
const log = console.log
const fse = require('fs-extra')

let write = process.argv.slice(2)[0] || false

let bpath
bpath = 'epub-32-new-features.epub' // v.3.2 - new format
// bpath = 'cole-voyage-of-life.epub'

// v.2
// bpath = 'minimal-v2.epub'
// bpath = 'phoenix-ru.epub'
// bpath = 'phoenix-en.epub'
// bpath = 'Moby-Dick-backwards-nav.epub'
// bpath = 'pg2701.epub'
// bpath = 'alice.epub'
// bpath = 'pg928.epub'
bpath = 'QuickStartGuide.epub'
bpath = 'Being_Different.epub'

bpath = path.resolve(__dirname, '../test', bpath)
log('RUN: BPATH', bpath)

async function start(bpath, write) {
  let {descr, mds, imgs} = await epub2md(bpath)
  // if (!mds) log('_ERR MESS', descr); return

  log('_descr:', descr)
  log('_mds:', mds.length)
  log('_imgs', imgs.length)
  // log('_slice', mds.slice(-10))
  // mds = mds.slice(0,5)
  mds.forEach(md=> {
    if (md[0] == '#') log('_title:', md)
  })
  if (write) {
    log('___WRITING', bpath)
    writeFiles(bpath, descr, mds)
  } else {
    return {descr, mds, imgs}
  }
}

start(bpath, write)

function writeFiles(bpath, descr, mds) {
  const dirpath = path.dirname(bpath)
  let mdpath = cleanDname(descr.author, descr.title)
  let dglpath = [mdpath, 'dgl'].join('.')
  dglpath = path.join(dirpath, dglpath)
  mdpath = [mdpath, 'md'].join('.')
  mdpath = path.join(dirpath, mdpath)
  descr.text = ['file:://', mdpath].join('')
  fse.writeJson(dglpath, descr, {spaces: 2})
  fse.writeJson(mdpath, mds, {spaces: 2})
}

export function cleanDname(author = '', title = '') {
  let str = [author.slice(0,25), title.slice(0,25)].join('-')
  return str.replace(/[)(,\.]/g,'').replace(/\s+/g, '-').replace(/\//g, '_').replace(/^-/, '')
}


// epub2json(bpath, export2dgl)
//   .then(res=> {
//     if (!res || !res.mds) return
//     log('__RES_descr:', res.descr)
//     log('__RES_mds:', res.mds.length)
//     log('__RES_imgs', res.imgs.length)

//     log('__RES_docs-sclice:', res.mds.slice(150, 152))
//     // log(res.docs.slice(-10))
//     // res.docs = res.docs.slice(0,5)
//     res.mds.forEach(md=> {
//       if (md[0] == '#') log('_title:', md)
//     })
//   })
