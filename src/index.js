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
  let docs
  try {
    docs = await getMDs(epub)
  } catch(err) {
    docs = []
  }
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

//
// todo: turndown!
// path !! - чтобы можно было alt - left - rught, etc
// ===== >>> ===== todo: footnotes-ok, осталось доделать: ===== <<<< =====
// ul, ol; table-tr; images
// === ну и <divs> в hindus, если их вообще делать
//
// == осталась загадка, почему нет ref-linknote-11 в bpath = 'astronomy.epub' ; if (flowchapter.id != 'item11') continue // astronomy
// а вместо footnote получается обычный параграф - _id: '0-23', href: true, md: '[1:linknoteref-11] For d'


async function getMDs(epub) {
  let docs = []
  let fns = []
  let chapterid = 0

  let levnumkey = {}, path = '00' // , counter = 0, filled, match
  let prevheader = {level: 0}
  let parent = {level: 0}

  for await (let flowchapter of epub.flow) {
    // log('_CH ID:', flowchapter.id)
    // continue
    if (flowchapter.id != 'item11') continue // astronomy
    // if (flowchapter.id != 'c06') continue // hindus

    let html  = await getChapter(epub, flowchapter.id)
    html = htmlChunk.trim()
    // log('_HTML', flowchapter.id, '====================================\n', flowchapter.id, html)
    html = html.replace(/\/>/g, '/></a>')

    let docid = 0
    let chapter = []
    const dom = new JSDOM(html)
    // dom = new JSDOM(html, {contentType: "application/xhtml+xml"})
    // dom = new JSDOM(html, {contentType: "text/html"})
    walk(dom.window.document.body.childNodes, function (node) {
      let md = node.textContent.trim()
      if (!md) return
      let doc = {_id: '', path: ''}
      md = md.slice(0,6) // nb: todo: <<==========
      if (/H\d/.test(node.nodeName)) {
        if (chapter.length) {
          chapter[0].size = chapter.length
          docs.push(chapter)
          chapter = []
          docid = 0
        }

        doc.level = node.nodeName.slice(1)*1
        if (levnumkey[doc.level] > -1) levnumkey[doc.level] += 1
        else levnumkey[doc.level] = 0
        // doc.levnum = levnumkey[doc.level]
        if (prevheader.level === doc.level) path = [prevheader.path.slice(0,-1), levnumkey[doc.level]].join('')
        else if (prevheader.level < doc.level) path = [prevheader.path, doc.level, levnumkey[doc.level]].join('') // levnumkey[doc.level] = 0,
        else if (prevheader.level > doc.level) {
          parent = _.last(_.filter(_.flatten(docs), (bdoc, idy)=> { return bdoc.level < doc.level  })) || {level: 0, path: _.flatten(docs)[0].path}
          path = [parent.path, doc.level, levnumkey[doc.level]].join('')
        }
        prevheader = doc

        // md = ['#'.repeat(doc.level), md].join(' ')
      } else if (node.nodeName === 'DIV') {
        // log('____DIV', md)
        return
      } else if (node.nodeName === 'P') {
        // footnotes, endnotes:
        let pid = node.id // calibre v.2 <p id>
        if (!pid) {
          let firstel = node.firstChild // gutenberg <p><a id>
          if (firstel && firstel.nodeName === 'A') pid = firstel.id
          log('_PID', docid, 'pid:', pid, md, 'FIRST-N', firstel.nodeName)
        }
        // log('_PID', pid)
        if (fns.includes(pid)) {
          doc._id = ['ref', pid].join('-')
          doc.footnote = true
        } else {
          let aels = node.querySelectorAll('a')
          _.each(aels, ael=> {
            let {fn, noteref} = getNoteRef(ael)
            if (!fn) return
            // log('____NOTEREF', noteref, 'FN', fn)
            md = md.replace(ael.textContent, noteref)
            doc.href = true
            fns.push(fn)
          })
        }
      } else if (node.nodeName == 'UL') {
        let olines = node.children
        _.each(olines, el=> {
          // LIST
        })
      } else {
        return
      } // if nodeName

      doc.path = path
      let _id = [path, docid].join('-')
      if (!doc._id) doc._id = _id
      doc.md = md
      chapter.push(doc)
      docid++
    })
    if (chapter.length) docs.push(chapter), chapter[0].size = chapter.length
    chapterid++
  }
  // log('___DOCS', docs.length)
  log('_FNS', fns.slice(0,15))
  return _.flatten(docs)
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

function zerofill(number, size) {
  number = number.toString()
  while (number.length < size) number = "0" + number
  return number
}
