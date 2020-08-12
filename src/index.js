'use strict'

import _ from 'lodash'
import EPub from 'epub'
const cheerio = require('cheerio')

// import Turndown from 'turndown'
// const tdnopts = {
//   linkStyle: 'inlined', // inlined or referenced
//   linkReferenceStyle: 'full' // full, collapsed, or shortcut
// }
// const tdn = new Turndown(tdnopts)

// let arule = {
//   filter: 'a',
//   replacement: function (content, node) {
//     if (!content) return
//     // if (!node.id) return
//     // log('_A_NODE.id', node.id)
//     let href = node.getAttribute('href')
//     if (!href) return
//     let noteref
//     if (href) {
//       noteref = href.split('#')[1]
//     }
//     if (!noteref) return
//     content = content.replace(/\\?\[/, '').replace(/\\?\]/, '')
//     log('_A_HREF:', noteref, '_CONT:', content, '_node.id:', node.id)
//     content = 'CONT:_' + content + '_CONT'

//     // return content + ':' + node.id
//     return content + '______::' + noteref +'__::'
//   }
// }
// tdn.addRule('a', arule)

const iso6393 = require('iso-639-3')
const log = console.log

export async function epub2md(bpath) {
  let epub = await getEpub(bpath)
  let meta = epub.metadata
  let lang = meta.language
  let iso = _.find(iso6393, iso=> iso.iso6391 == lang)
  if (iso) lang = iso.iso6393
  let descr = {author: meta.creator, title: meta.title, lang: lang} // , description: meta
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
  let ftns = []
  for await (let chapter of epub.flow) {
    // if (chapter.id != 'item11') continue
    let html  = await getChapter(epub, chapter.id)
    // log('_HTML', chapter.id, '====================================\n', chapter.id, html)
    const $ = cheerio.load(html)

    $('p').each(function(i, elem) {
      let text = $(this).text()
      if (/76/.test(text)) {
        log('_P', text)
      }
    })

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
