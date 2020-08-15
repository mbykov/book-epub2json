'use strict'

import _ from 'lodash'
import EPub from 'epub'

const jsdom = require("jsdom")
const { JSDOM } = jsdom
// const walk = require("dom-walk")

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
    log('____IMPORT ERR', err)
    docs = []
  }
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

// https://www.javascriptcookbook.com/article/traversing-dom-subtrees-with-a-recursive-walk-the-dom-function/
function walk(node, callback) {
  if (callback(node) === false) return false;
  node = node.firstChild;
  while (node != null) {
    if (walk(node, callback) === false) return false;
    node = node.nextSibling;
  }
}

function walk_(node, func) {
  let children = node.childNodes;
  for (let i = 0; i < children.length; i++)  // Children are siblings to each other
    walk(children[i], func);
  func(node);
}


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
    // if (flowchapter.id != 'item11') continue // astronomy
    // if (flowchapter.id != 'c06') continue // hindus

    let html  = await getChapter(epub, flowchapter.id)

    // html = htmlChunk.trim()
    // log('_HTML', flowchapter.id, '====================================\n', flowchapter.id, html)

    html = html.replace(/\/>/g, '/></a>') // jsdom xhtml feature

    let docid = 0
    let chapter = []
    const dom = new JSDOM(html)
    // dom = new JSDOM(html, {contentType: "application/xhtml+xml"})
    // dom = new JSDOM(html, {contentType: "text/html"})

    loop(dom.window.document.body)
    function loop(node){
      // do some thing with the node here
      let nodes = node.childNodes;

      nodes.forEach(function(node) {
        // createDoc(node, chapter, docs, docid, levnumkey, prevheader, parent, fns, path)

        if (!node.textContent) return
        let md = node.textContent.trim()
        md = cleanStr(md)
        if (!md) return
        let doc = {_id: '', path: ''}

        // md = md.slice(0, 5) // nb: todo: <<======================================= /////////////////////
        // log('_N', node.nodeName)

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
            // log('_PID', docid, 'pid:', pid, md, 'FIRST-N', firstel.nodeName)
          }
          // log('_PID', pid)
          if (fns.includes(pid)) {
            doc._id = ['ref', pid].join('-')
            doc.footnote = true
          } else {
            // let aels = node.querySelectorAll('a')
            let aels = _.filter(node.childNodes, node=> node.nodeName == 'A')
            _.each(aels, ael=> {
              let {refnote, notepath} = getRefnote(ael)
              if (!notepath) return
              // log('____REFNOTE', refnote, 'NotePath', notepath)
              // md = md.replace(ael.textContent, refnote)
              // doc.refnote = true
              if (!doc.notes) doc.refnotes = []
              let docnote = {}
              docnote[refnote] = notepath
              doc.refnotes.push(docnote)
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

        doc.path = path
        let _id = [path, docid].join('-')
        if (!doc._id) doc._id = _id
        doc.md = md
        chapter.push(doc)
        docid++
      }) // each node

      for (let i = 0; i <nodes.length; i++) {
        if(!nodes[i]) continue
        if(nodes[i].childNodes.length > 0) {
          loop(nodes[i])
        }
      }
    } // loop

    // walk(dom.window.document.body, function (node) {
    //   if (!node.textContent) return
    //   let md = node.textContent.trim()
    //   if (!md) return
    //   md = cleanStr(md)
    //   let doc = {_id: '', path: ''}
    //   md = md.slice(0, 5) // nb: todo: <<===========================
    //   // log('_N', node.nodeName)

    //   if (/H\d/.test(node.nodeName)) {
    //     if (chapter.length) {
    //       chapter[0].size = chapter.length
    //       docs.push(chapter)
    //       chapter = []
    //       docid = 0
    //     }

    //     doc.level = node.nodeName.slice(1)*1
    //     if (levnumkey[doc.level] > -1) levnumkey[doc.level] += 1
    //     else levnumkey[doc.level] = 0
    //     // doc.levnum = levnumkey[doc.level]
    //     if (prevheader.level === doc.level) path = [prevheader.path.slice(0,-1), levnumkey[doc.level]].join('')
    //     else if (prevheader.level < doc.level) path = [prevheader.path, doc.level, levnumkey[doc.level]].join('') // levnumkey[doc.level] = 0,
    //     else if (prevheader.level > doc.level) {
    //       parent = _.last(_.filter(_.flatten(docs), (bdoc, idy)=> { return bdoc.level < doc.level  })) || {level: 0, path: _.flatten(docs)[0].path}
    //       path = [parent.path, doc.level, levnumkey[doc.level]].join('')
    //     }
    //     prevheader = doc
    //     md = md.replace(/\.$/, '')

    //     // md = ['#'.repeat(doc.level), md].join(' ')
    //   } else if (node.nodeName === 'DIV') {
    //     // log('____DIV', md)
    //     return
    //   } else if (node.nodeName === 'P') {
    //     // footnotes, endnotes:
    //     let pid = node.id // calibre v.2 <p id>
    //     if (!pid) {
    //       let firstel = node.firstChild // gutenberg <p><a id>
    //       if (firstel && firstel.nodeName === 'A') pid = firstel.id
    //       // log('_PID', docid, 'pid:', pid, md, 'FIRST-N', firstel.nodeName)
    //     }
    //     // log('_PID', pid)
    //     if (fns.includes(pid)) {
    //       doc._id = ['ref', pid].join('-')
    //       doc.footnote = true
    //     } else {
    //       let aels = node.querySelectorAll('a')
    //       _.each(aels, ael=> {
    //         let {refnote, notepath} = getRefnote(ael)
    //         if (!fn) return
    //         // log('____REFNOTE', refnote, 'FN', fn)
    //         md = md.replace(ael.textContent, refnote)
    //         doc.href = true
    //         fns.push(fn)
    //       })
    //     }
    //   } else if (node.nodeName == 'UL') {
    //     let olines = node.children
    //     _.each(olines, el=> {
    //       // LIST
    //     })
    //   } else {
    //     return
    //   } // if nodeName

    //   doc.path = path
    //   let _id = [path, docid].join('-')
    //   if (!doc._id) doc._id = _id
    //   doc.md = md
    //   chapter.push(doc)
    //   docid++
    // }) // walk

    if (chapter.length) docs.push(chapter), chapter[0].size = chapter.length
    chapterid++
  }
  // log('___DOCS', docs.length)
  // log('_FNS', fns.slice(0,15))
  return _.flatten(docs)
}

// refnote:chid-fn
function getRefnote(ael) {
  let notepath = ael.getAttribute('href')
  if (!notepath) return {fn: null}
  notepath = notepath.split('#')[1]
  let refnote = ael.textContent.replace(/\[/g, '').replace(/\]/g, '')
  // refnote = ['[', refnote, ':', notepath, ']'].join('')
  // log('_A:', ael.outerHTML, '_FN:', fn)
  // log('_Z', ael.textContent)
  // log('_REF', refnote)
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
