'use strict'

const _ = require('lodash')
const fse = require('fs-extra')
const path = require("path")
const log = console.log
const util = require("util")
// new:
const zip = require("jszip")
const xml2js = require('xml2js')
const naturalCompare = require("natural-compare-lite")
const iso6393 = require('iso-639-3')
// const iconv = require('iconv-lite');

let insp = (o) => log(util.inspect(o, false, null))

// const Turndown = require('turndown')
import Turndown from 'turndown'
const tdn = new Turndown()
tdn.remove('head')
tdn.remove('style')
tdn.remove('title')

let rule1 = {
  filter: 'h1',
  replacement: function (content, node) {
    return replaceHeader(1, content, node)
  }
}
tdn.addRule('h1', rule1)

let rule2 = {
  filter: 'h2',
  replacement: function (content, node) {
    return replaceHeader(2, content, node)
  }
}
tdn.addRule('h2', rule2)

let rule3 = {
  filter: 'h3',
  replacement: function (content, node) {
    return replaceHeader(3, content, node)
  }
}
tdn.addRule('h3', rule3)

function replaceHeader(level, content, node) {
  let nodeid = node.getAttribute('id')
  let hashes = '#'.repeat(level) + ' '
  let header = ''
  if (nodeid) header = 'header: ' + level + ' ' + nodeid + '\n\n'
  header += hashes
  header += content
  return header
}

export async function epub2json(bpath, dgl)  {
  const data = await fse.readFile(bpath)
  // log('_data', data.length)
  let {content, zfiles} = await zip.loadAsync(data)
    .then(function (zip) {
      log('_ZIP.FILES', zip.files.length);

      // let names = _.map(zip.files, file=> file.name)
      // names = names.filter(name=> !/image/.test(name))
      // log('_NAMES', names);
      // let tocfile = _.find(zip.files, file=> { return /toc.ncx/.test(file.name) })

      let content = _.find(zip.files, file=> { return /\.opf/.test(file.name) })
      let zfiles = _.filter(zip.files, file=> { return /\.x?html/.test(file.name) }) // \.html, .xhtml
      zfiles.sort(function(a, b){
        return naturalCompare(a.name, b.name)
      })
      return {content, zfiles}
    })
  // log('_after-cont:', content)
  // log('_after-zfiles_:', zfiles.length)

  // let toc = await tocfile
  //     .async('text')
  //     .then(data=> {
  //       return xml2js.parseStringPromise(data).then(function (tocdata) {
  //         log('_TOC', tocdata)
  //         // log('_ncx', tocdata.ncx)
  //         // log('_container', tocdata.container.rootfiles[0].rootfile)
  //         // log('_navMap', tocdata.ncx.navMap)
  //         // log('_navPoint', tocdata.ncx.navMap[0].navPoint)
  //         return {}
  //       })
  //     })

  let descr = await content
      .async('text')
      .then(data=> {
        return xml2js.parseStringPromise(data).then(function (content) {
          // log('_C', content)
          let version = content.package.$.version
          let metadata = content.package.metadata[0]
          // let author = (metadata['dc:creator']) ? metadata['dc:creator'][0]._ : ''
          let author = '', title = '', lang = ''
          // log('_M', version, metadata)
          if (metadata['dc:creator']) {
            author = metadata['dc:creator'][0]
            if (author._) author = author._
          }
          if (metadata['dc:title']) {
            title = metadata['dc:title'][0]
            if (title._) title = title._
          }
          if (metadata['dc:language']) {
            lang = metadata['dc:language'][0]
            if (lang._) lang = lang._
          }
          if (lang) {
            if (lang._) lang = lang._
            lang = lang.split('-')[0]
            let iso = _.find(iso6393, iso=> iso.iso6391 == lang)
            if (iso) lang = iso.iso6393
          }
          let descr = {version, author, title, lang}
          // log('_descr_', descr)
          return descr
        })
      })
  // log('_DESCR', descr)
  // zfiles = zfiles.slice(21, 22)

  const mds = await html2md(zfiles)
  // let headers = mds.filter(row=> /#/.test(row))
  // let min = headers.map(header=> (header.match(/#/g) || []).length)
  // let min = _.min(headers.map(header=> (header.match(/#/g) || []).length))
  // log('_MIN', min)

  let doc
  let docs = []
  mds.forEach(md=> {
    doc = {}
    if (md.match(/^#/)) {
      doc.level = md.match(/#/g).length
    }
    doc.md = md
    docs.push(doc)
  })

  // log('____DOCS', docs.length)

  if (dgl) export2md(bpath, descr, mds)
  else return {descr, docs}
}

async function html2md(zfiles) {
  return await Promise.all(zfiles.map(zfile=> {
    return getMD(zfile)
  }))
    .then(res=> {
      res = _.compact(res)
      res.sort(function(a, b){
        return naturalCompare(a.name, b.name)
      })
      let clean, cleans = []
      res.forEach(result=> {
        result.mds.forEach((row, idx)=> {
          clean = row
          if (idx) clean = row.replace(/#/g, '')
          cleans.push(clean)
        })
      })

      let mds = _.flatten(res.map(md=> md.mds))
      // let md = _.flatten(mds)
      // let headers = md.filter(row=> /#/.test(row))
      // log('_MD-res:', md)
      return cleans
    })
}

// — m-dash

function getMD(zfile) {
  return zfile
    .async('text')
    .then(html => {
      html = html.split(/<body[^>]*>/)[1]
      if (!html) return
      html = html.split(/<\/body>/)[0]
      let md = tdn.turndown(html)
      // let mds = md.split('\n').map(md=> cleanText(md.trim()))
      let mds = md.split('\n')
      mds = _.compact(mds)
      // mds.forEach(md=> md.trim())
      mds = mds.map(md=> cleanText(md.trim()))
      mds = mds.filter(md => !/header:/.test(md))
      // mds = mds.slice(0,9)
      return {name: zfile.name, mds: mds}
    })
}

function cleanText(str) {
  if (!str) return ''
  // https://www.utf8-chartable.de/unicode-utf8-table.pl?start=8192&number=128
  let clean = str.replace(/\s\s+/g, ' ') // .replace(/—/g, ' - ').replace(/’/g, '\'')
  return clean
}

function export2md(bpath, descr, mds) {
  const dirpath = path.dirname(bpath)
  let mdpath = cleanDname(descr.author, descr.title)
  let dglpath = [mdpath, 'dgl'].join('.')
  dglpath = path.join(dirpath, dglpath)
  mdpath = [mdpath, 'md'].join('.')
  mdpath = path.join(dirpath, mdpath)
  descr.text = ['file:://', mdpath].join('')
  // log('_M-before', mds)
  fse.writeJson(dglpath, descr, {spaces: 2})
  let file = fse.createWriteStream(mdpath)
  file.on('error', function(err) { log('ERR:', err) })
  mds.forEach(row => file.write(`${row}\r\n\r\n`))
  file.end()
}

export function cleanDname(author = '', title = '') {
  let str = [author.slice(0,25), title.slice(0,25)].join('-')
  return str.replace(/[)(,\.]/g,'').replace(/\s+/g, '-').replace(/\//g, '_').replace(/^-/, '')
}
