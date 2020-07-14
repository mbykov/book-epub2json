//

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

const Turndown = require('turndown')
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
      // log('_ZIP.FILES', zip.files);
      let content = _.find(zip.files, file=> { return /\.opf/.test(file.name) })
      let zfiles = _.filter(zip.files, file=> { return /\.x?html/.test(file.name) }) // \.html, .xhtml
      zfiles.sort(function(a, b){
        return naturalCompare(a.name, b.name)
      })
      return {content, zfiles}
    })
  // log('_after-cont:', content)
  // log('_after-zfiles_:', zfiles.length)

  let descr = await content
      .async('text')
      .then(data=> {
        return xml2js.parseStringPromise(data).then(function (content) {
          let version = content.package.$.version
          let metadata = content.package.metadata[0]
          // let author = (metadata['dc:creator']) ? metadata['dc:creator'][0]._ : ''
          let author = metadata['dc:creator'][0]
          let title = metadata['dc:title'][0]
          let lang = metadata['dc:language'][0]
          if (lang) {
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
  // zfiles = await zfiles.slice(10, 15)

  const mds = await html2md(zfiles)

  if (!dgl) return {descr: descr, mds: mds}

  export2md(bpath, descr, mds)
}

function export2md(bpath, descr, mds) {
  const dirpath = path.dirname(bpath)
  let mdpath = cleanDname(descr.author, descr.title)
  let dglpath = [mdpath, 'dgl'].join('.')
  dglpath = path.join(dirpath, dglpath)
  mdpath = [mdpath, 'md'].join('.')
  mdpath = path.join(dirpath, mdpath)
  descr.text = ['file:://', mdpath].join('')
  let rows = mds.join('\n')
  fse.writeJson(dglpath, descr, {spaces: 2})
  fse.writeFile(mdpath, rows)
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
      let mds = res.map(md=> md.mds)
      let md = _.flatten(mds)
      let headers = md.filter(row=> /#/.test(row))
      // log('_MD-res:', md)
      return headers
    })
}

function getMD(zfile) {
  return zfile
    .async('text')
    .then(html => {
      html = html.split(/<body[^>]*>/)[1]
      if (!html) return
      html = html.split(/<\/body>/)[0]
      let md = tdn.turndown(html)
      let mds = md.split('\n').map(md=> cleanText(md.trim()))
      mds = _.compact(mds)
      mds = mds.filter(md => !/header:/.test(md))
      mds = mds.slice(0,3)
      return {idx: zfile.idx, name: zfile.name, mds: mds}
    })
}

function cleanText(str) {
  if (!str) return ''
  let clean = str.replace(/\s\s+/g, ' ')
  return clean
}

export function cleanDname(author = '', title = '') {
  let str = [author.slice(0,25), title.slice(0,25)].join('-')
  return str.replace(/[)(,\.]/g,'').replace(/\s+/g, '-').replace(/\//g, '_').replace(/^-/, '')
}
