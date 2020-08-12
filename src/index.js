'use strict'

import _ from 'lodash'
import EPub from 'epub'
const iso6393 = require('iso-639-3')
const log = console.log

export async function epub2md(bpath) {
  let epub = await getEpub(bpath)
  let meta = epub.metadata
  let lang = meta.language
  let iso = _.find(iso6393, iso=> iso.iso6391 == lang)
  if (iso) lang = iso.iso6393
  let descr = {author: meta.creator, title: meta.title, lang: lang, description: meta.description}
  let mds = await getMDs(epub)

  return {descr: descr, mds: mds, imgs: []}
}

function getEpub(bpath) {
  return new Promise((resolve, reject) => {
    const epub = new EPub(bpath, 'images', 'chapters')
    epub.on("end", function(){
      resolve(epub)
    })
    epub.on('error', reject)
    epub.parse()
  })
}

async function getMDs(epub) {
  let ids = []
  for await (let chapter of epub.flow) {
    // let {err, text} = await getChapter(epub, chapter.id)
    let html  = await getChapter(epub, chapter.id)
    log('_HTML', chapter.id, html.length)
    ids.push(chapter.id)
  }
  log('_IDS', ids)

  return ['kuku']
}

function getChapter(epub, id) {
  return new Promise((resolve, reject) => {
    epub.getChapter(id, function(error, html) {
      resolve(html)
    })
  })
}
