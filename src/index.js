'use strict'

import _ from 'lodash'
import EPub from 'epub'

const jsdom = require("jsdom")
const { JSDOM } = jsdom

const iso6393 = require('iso-639-3')
const log = console.log
import { htmlChunk} from './html'

export async function epub2json(bpath) {
  let epub = await getEpub(bpath)
  let meta = epub.metadata
  let lang = meta.language
  // log('____EPUB epub.metadata', epub.manifest)
  let iso = _.find(iso6393, iso=> iso.iso6391 == lang)
  if (iso) lang = iso.iso6393
  let descr = {type: 'epub', author: meta.creator, title: meta.title, lang: lang} // , description: meta
  let toc = _.filter(epub.manifest, chapter=> chapter.order)
  let chapters = toc.map(chapter=> {return { id: chapter.id, title: chapter.title }})
  // log('_chapters', chapters)


  let docs
  try {
    docs = await getMDs(epub, chapters)
  } catch(err) {
    log('____EPUB IMPORT ERR', err)
    docs = []
  }
  let zerodoc = {level: 3, md: [descr.author, descr.title].join(', ')}
  docs.unshift(zerodoc)

  // log('_META-TOC', epub.toc)
  // log('_EPUB-docs', docs)
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

async function getMDs(epub, chapters) {
  let docs = []
  let fns = []

  for await (let flowchapter of epub.flow) {
    let chapter = chapters.find(chapter=> chapter.id == flowchapter.id)
    if (chapter) {
      let titledoc = {level: 3, md: chapter.title}
      docs.push(titledoc)
    }

    let html  = await getChapter(epub, flowchapter.id)
    // log('_HTML====================================\n', flowchapter.id, html.length)
    html = html.replace(/\/>/g, '/></a>') // jsdom xhtml feature

    let docid = 0
    const dom = new JSDOM(html)
    // dom = new JSDOM(html, {contentType: "application/xhtml+xml"})
    // dom = new JSDOM(html, {contentType: "text/html"})

    loop(dom.window.document.body)
    function loop(node){
      let nodes = node.childNodes;
      // let first = true
      nodes.forEach(function(node) {
        if (!node.textContent) return
        let md = node.textContent.trim()
        md = cleanStr(md)
        if (!md) return
        // let doc = {_id: '', path: ''}
        let doc = {}
        // if (first && chIDs.includes(flowchapter.id)) {
        //   doc.level = 3
        //   first = false
        // }

        if (/H\d/.test(node.nodeName)) {
          doc.level = node.nodeName.slice(1)*1
          md = md.replace(/\.$/, '')
        } else if (node.nodeName === 'DIV') {
          return
        } else if (node.nodeName === 'P') {
          // footnotes, endnotes:
          let pid = node.id // calibre v.2 <p id>
          if (!pid) {
            let firstel = node.firstChild // gutenberg <p><a id>
            if (firstel && firstel.nodeName === 'A') pid = firstel.id
          }
          if (fns.includes(pid)) {
            doc._id = ['ref', pid].join('-')
            doc.footnote = true
          } else {
            // let aels = node.querySelectorAll('a') // electron security violation
            let aels = _.filter(node.childNodes, node=> node.nodeName == 'A')
            _.each(aels, ael=> {
              let {refnote, notepath} = getRefnote(ael)
              if (!notepath) return
              if (!doc.refnote) doc.refnote = {}
              // doc.refnote[refnote] = ['ref', notepath].join('-')
              doc.refnote[refnote] = notepath
              fns.push(notepath)
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

        doc.md = md
        docs.push(doc)
      }) // each node

      for (let i = 0; i <nodes.length; i++) {
        if(!nodes[i]) continue
        if(nodes[i].childNodes.length > 0) {
          loop(nodes[i])
        }
      }
    } // loop
  }

  let header = docs.find(doc=> doc.level > -1)
  if (!header) header = docs[0], header.level = 1
  return _.flatten(docs)
}

function getRefnote(ael) {
  let notepath = ael.getAttribute('href')
  if (!notepath) return {refnote: null}
  notepath = notepath.split('#')[1]
  if (!notepath) return {refnote: null}
  notepath = notepath.replace(/ref-/g, '')
  let refnote = ael.textContent.replace(/\[/g, '').replace(/\]/g, '').replace(/ref-/g, '')
  if (refnote.length > 3) return {refnote: null} // not footnotes
  return {refnote, notepath}
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

function cleanStr(str) {
  // return str.replace(/\n+/g, '\n').replace(/↵+/, '\n').replace(/  +/, ' ') // .replace(/\s+/, ' ')
  return str.replace(/\n+/g, ' ').replace(/↵+/, '\n').replace(/  +/, ' ') // .replace(/\s+/, ' ')
  // todo: проверить - см Camus, La Chute - короткие строки имеющие \n в конце каждой
}
