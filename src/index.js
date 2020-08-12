'use strict'

import _ from 'lodash'

import EPub from 'epub'

const log = console.log

export async function epub2md(bpath) {
  log('_epub2md-bpath_', bpath)

  let epub = await getEpub(bpath)
  // log('_EPUB', epub)
  let descr = epub.metadata
	console.log('_TITLE', epub.metadata.title);

  return {descr: descr, mds: [], imgs: []}
}

function getEpub(bpath) {
  return new Promise((resolve, reject) => {
    const epub = new EPub(bpath, 'images', 'chapters')
    log('_meta_', epub.metadata)
    epub.on("end", function(){
      resolve(epub)
    })
    epub.on('error', reject)
    epub.parse()
  })
}
