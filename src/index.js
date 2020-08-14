'use strict'

import _ from 'lodash'
import EPub from 'epub'
const cheerio = require('cheerio')
// const htmlparser2 = require('htmlparser2')

const jsdom = require("jsdom")
const { JSDOM } = jsdom
const walk = require("dom-walk")

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
  for await (let flowchapter of epub.flow) {
    // log('_HTML', chapter.id)
    // continue

    if (flowchapter.id != 'item11') continue // astronomy
    // if (flowchapter.id != 'c06') continue // hindus

    let html  = await getChapter(epub, flowchapter.id)
    // html = htmlChunk.trim()
    // log('_HTML', flowchapter.id, '====================================\n', flowchapter.id, html)

    let parid = 0
    let chapter = []
    const dom = new JSDOM(html)
    walk(dom.window.document.body.childNodes, function (node) {
      // log('_NODE:', node.nodeName, node.id)
      if (!node.textContent) return
      let doc = {_id: ''}
      let md = node.textContent.slice(0,10).trim()
      if (/H\d/.test(node.nodeName)) {
        if (chapter.length) docs.push(chapter), chapter = []
        doc.level = node.nodeName[1]
        md = node.textContent.slice(0,10).trim()
        md = ['#'.repeat(doc.level), md].join(' ')
      } else if (node.nodeName == 'P') {
        md = node.textContent.slice(0,10).trim()
        // footnotes, endnotes:
        let pid = node.id // calibre v.2 <p id>
        if (!pid) {
          let firstel = node.firstChild // gutenberg <p><a id>
          if (firstel && firstel.nodeName == 'A') pid = firstel.id
        }
        log('_PID', pid)
        if (fns.includes(pid)) {
          doc._id = ['ref', pid].join('-')
          doc.footnote = true
          doc.md = md
        } else {
          let aels = node.querySelectorAll('a')
          _.each(aels, ael=> {
            let {fn, noteref} = getNoteRef(ael)
            if (!fn) return
            log('____NOTEREF', noteref, 'FN', fn)
            md = md.replace(ael.textContent, noteref)
            doc.href = true
            fns.push(fn)
          })
        }
      } else if (node.nodeName == 'UL') {
        //
        // ===== >>> ===== todo: footnotes-ok, осталось доделать: ===== <<<< =====
        // ul, ol; table-tr; images
        // === ну и <divs> в hindus, если их вообще делать
        //
        // == осталась загадка, почему нет ref-linknote-11 в bpath = 'astronomy.epub' ; if (flowchapter.id != 'item11') continue // astronomy
        // а вместо footnote получается обычный параграф - _id: '0-23', href: true, md: '[1:linknoteref-11] For d'
        let olines = node.children
        _.each(olines, el=> {
          //
        })
      } else {
        return
      }
      let _id = [chapterid, parid].join('-')
      if (!doc._id) doc._id = _id
      doc.md = md
      parid++
      chapter.push(doc)
    })
    if (chapter.length) docs.push(chapter)
    // log('___DOCS', docs)
    chapterid++
  }
  log('_FNS', fns.slice(0,5))
  let footnotes = docs.filter(doc=> doc.footnote)
  let hrefs = docs.filter(doc=> doc.href)
  // log('_HREFS', hrefs.slice(0,5))
  // log('_FNS', footnotes.slice(0,5))
  // log('_DOCS_____:', docs.slice(0,5))
  log('_DOCS_____:', docs)

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
