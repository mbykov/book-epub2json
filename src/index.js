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
  let docs = []
  docs = await getMDs(epub)


  // log('_META', epub.toc)
  return {descr, docs, imgs: []}
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
// что делать с em, bold - линеарными тегами? пока пропустить?
async function getMDs(epub) {
  let docs = []
  let fns = []
  let chapterid = 0
  for await (let chapter of epub.flow) {
    // log('_HTML', chapter.id)
    // continue

    // if (chapter.id != 'item11') continue
    // if (chapter.id != 'c06') continue

    let html  = await getChapter(epub, chapter.id)
    // html = htmlChunk.trim()
    // log('_HTML', chapter.id, '====================================\n', chapter.id, html)

    // <i class="calibre3">Jaiminiya Brahmana</i> (c. 600 BCE)<a href="doni_9781101028704_oeb_nts_r1_split_000.html#en388" id="Ref-en388"><sup class="calibre6">2</sup></a>

    const frag = JSDOM.fragment(html)
    // let pars = frag.children
    // let pars = frag.querySelectorAll('div')
    // log('_PARS', pars.length)

    let pars = frag.querySelectorAll('p')
    let parid = 0
    _.each(pars, el=> {
      let _id = [chapterid, parid].join('-')
      let doc = {_id: _id}
      let md = el.textContent.trim()
      if (!md) return
      // log('_HTML', parid, '====================================\n', chapter.id, html)

      // if (!/\[76/.test(md)) return
      // if (!/en388/.test(el.outerHTML)) return
      // log('_only:', el.outerHTML)
      // log('_CH', el.nodeName, el.id)

      // walk - hasChildren => etc ? <=========================== HERE

      if (el.nodeName == 'P') {
        let pid = el.id // calibre v.2 <p id>
        if (!pid) {
          let firstel = el.firstChild // gutenberg <p><a id>
          if (firstel.nodeName == 'A') {
            pid = firstel.id
          }
        }
        if (fns.includes(pid)) {
          doc._id = pid
          doc.footnote = true
          doc.md = md
          docs.push(doc)
          return
        }
        let aels = el.querySelectorAll('a')
        _.each(aels, ael=> {
          let {fn, noteref} = getNoteRef(ael)
          if (!fn) return
          md = md.replace(ael.textContent, noteref)
          doc.href = true
          fns.push(fn)
        })
        doc.md = md
        docs.push(doc)

      } else if (el.nodeName == 'UL') {
        let olines = el.children
        _.each(olines, el=> {
        })
      }
      parid++
    })
    // log('_CHs', children.length)
    chapterid++
  }
  log('_FNS', fns.slice(0,5))
  let footnotes = docs.filter(doc=> doc.footnote)
  let hrefs = docs.filter(doc=> doc.href)
  log('_HREFS', hrefs.slice(0,5))
  log('_FNS', footnotes.slice(0,5))

  return ['kuku']
}

// noteref:chid-fn
function getNoteRef(ael) {
  let fn = ael.getAttribute('href')
  if (!fn) return {fn: null}
  fn = fn.split('#')[1]
  let noteref = ael.textContent.replace(/\[/g, '').replace(/\]/g, '')
  noteref = ['[', noteref, ':', fn, ']'].join('')
  // log('_A:', ael.outerHTML, '_FN:', fn)
  // log('_Z', ael.textContent)
  // log('_REF', noteref)
  return {fn, noteref}
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
