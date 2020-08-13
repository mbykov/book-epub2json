'use strict'

import _ from 'lodash'
import EPub from 'epub'
const cheerio = require('cheerio')
// const htmlparser2 = require('htmlparser2')

const jsdom = require("jsdom")
const { JSDOM } = jsdom

const iso6393 = require('iso-639-3')
const log = console.log
import { htmlChunk} from './html'

export async function epub2md(bpath) {
  let epub = await getEpub(bpath)
  let meta = epub.metadata
  let lang = meta.language
  let iso = _.find(iso6393, iso=> iso.iso6391 == lang)
  if (iso) lang = iso.iso6393
  let descr = {author: meta.creator, title: meta.title, lang: lang} // , description: meta
  let mds = await getMDs(epub)
  // let mds = []

  // let html = '<html><p>some text </p><p><a href="xxx#yyy" class="www">zzz</a></p><p class="ptext">p-text-par</p></html>'
  // // let ahtml = dom.window.document.querySelector("a").outerHTML
  // let el = q(html, 'a')
  // log('_A-html', el.outerHTML)
  // log('_A-href', el.getAttribute('href'))

  // let $ = cheerio.load(html)
  // log('_HTML', $.html())
  // let ahref = cheerio.html($('a'))
  // // let alink = $('a').attr('href')
  // log('_A_HREF', ahref)

  // log('_APPLE', $('.www').attr('id', 'favorite').html())
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

// пока что только tags: h, p, ul, img ???, todo: table
async function getMDs(epub) {
  let docs = []
  let ids = []
  let ftns = []
  for await (let chapter of epub.flow) {
    if (chapter.id != 'item11') continue
    let html  = await getChapter(epub, chapter.id)
    html = htmlChunk.trim()
    // log('_HTML', chapter.id, '====================================\n', chapter.id, html)

    const frag = JSDOM.fragment(html)
    let children = frag.children
    _.each(children, el=> {
      log('_CH', el.nodeName)
      if (el.nodeName == 'P') {

      } else if (el.nodeName == 'UL') {
        let olines = el.children
        _.each(olines, el=> {

        })
      }
      let footnote = el.querySelector('a')
      if (footnote) {
        log('_A-FN', footnote.outerHTML)
      }
    })
    log('_CHs', children.length)

    ids.push(chapter.id)
  }
  log('_IDS', ids)

  return ['kuku']
}

function q(html, selector) {
  const frag = JSDOM.fragment(html)
  return frag.querySelector(selector)
}

function getChapter(epub, id) {
  return new Promise((resolve, reject) => {
    epub.getChapter(id, function(error, html) {
      resolve(html)
    })
  })
}
