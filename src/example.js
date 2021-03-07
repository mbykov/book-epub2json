'use strict'

import { epub2json } from "./index";
const log = console.log
const path = require("path")

let bpath = 'file-1.epub'
bpath = 'La peste - Albert Camus.epub'
bpath = 'Orwell, George - Nineteen Eighty-Four (Penguin, 2003).epub'
bpath = path.resolve(__dirname, '../test/', bpath)

async function start(bpath) {
  log('_epub2json-bpath_', bpath)
  let {descr, docs, imgs} = await epub2json(bpath)
  log('_descr:', descr)

  log('_docs:', docs.length)
  log('_imgs', imgs.length)

}

start(bpath)
