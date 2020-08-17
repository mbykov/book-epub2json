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
  let iso = _.find(iso6393, iso=> iso.iso6391 == lang)
  if (iso) lang = iso.iso6393
  let descr = {type: 'epub', author: meta.creator, title: meta.title, lang: lang} // , description: meta
  let docs
  try {
    docs = await getMDs(epub)
  } catch(err) {
    log('____EPUB IMPORT ERR', err)
    docs = []
  }

  // let  author = {_id: '0-0', md: descr.author}
  // let  title = {_id: '0-1', md: descr.title, level: 0}
  // docs.unshift(title)
  // docs.unshift(author)

  // log('_META', epub.toc)
  log('_EPUB-docs', docs.length)
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

async function getMDs(epub) {
  let docs = []
  let fns = []

  // let chapterid = 0
  // let levnumkey = {}, path = '00' // , counter = 0, filled, match
  // let prevheader = {level: 0}
  // let parent = {level: 0}

  for await (let flowchapter of epub.flow) {
    // log('_CH ID:', flowchapter.id)
    // continue
    // if (flowchapter.id != 'item11') continue // astronomy
    // if (flowchapter.id != 'c06') continue // hindus

    let html  = await getChapter(epub, flowchapter.id)

    // html = htmlChunk.trim()
    // log('_HTML', flowchapter.id, '====================================\n', flowchapter.id, html)
    html = html.replace(/\/>/g, '/></a>') // jsdom xhtml feature

    let docid = 0
    // let chapter = []
    const dom = new JSDOM(html)
    // dom = new JSDOM(html, {contentType: "application/xhtml+xml"})
    // dom = new JSDOM(html, {contentType: "text/html"})

    loop(dom.window.document.body)
    function loop(node){
      let nodes = node.childNodes;

      nodes.forEach(function(node) {
        if (!node.textContent) return
        let md = node.textContent.trim()
        md = cleanStr(md)
        if (!md) return
        let doc = {_id: '', path: ''}

        // log('_N', node.nodeName)
        if (/H\d/.test(node.nodeName)) {
          doc.level = node.nodeName.slice(1)*1
          md = md.replace(/\.$/, '')
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
              doc.refnote[refnote] = ['ref', notepath].join('-')
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
  // log('_FNS', fns.slice(0,15))
  // log('_DDDD', docs)
  // structuredDocs(docs)
  return _.flatten(docs)
}

function getRefnote(ael) {
  let notepath = ael.getAttribute('href')
  if (!notepath) return {refnote: null}
  notepath = notepath.split('#')[1]
  let refnote = ael.textContent.replace(/\[/g, '').replace(/\]/g, '')
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
  return str.replace(/\n+/g, '\n').replace(/↵+/, '\n').replace(/  +/, ' ') // .replace(/\s+/, ' ')
}

function structuredDocs(docs) {
  const fillsize = docs.length.toString().length
  let baredocs = []
  let level = 0, levnumkey = {}, path = '00', counter = 0, filled, headstart = -1
  let prevheader = {level: 0, path: '00'}
  let parent = {level: 0, path: ''}
  for (let doc of docs) {
    if (doc.level > -1) {
      level = doc.level
      counter = 0
      if (levnumkey[level] > -1) levnumkey[level] += 1
      else levnumkey[level] = 0
      doc.levnum = levnumkey[level] || 0

      if (prevheader.level === level) path = [prevheader.path.slice(0,-1), levnumkey[level]].join('')
      else if (prevheader.level < level) levnumkey[level] = 0, path = [prevheader.path, level, levnumkey[level]].join('')
      else if (prevheader.level > level) {
        parent = _.last(_.filter(baredocs, (bdoc, idy)=> { return bdoc.level < doc.level  })) || {level: 0, path: '00'}
        path = [parent.path, level, levnumkey[level]].join('')
      }
      prevheader = doc
    }

    doc.path = path
    filled = zerofill(counter, fillsize)
    if (!doc._id) doc._id = [path, filled].join('-')

    counter++
    prevheader.size = counter
    baredocs.push(doc)
  }
}
