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

// const showdown  = require('showdown')
// const  converter = new showdown.Converter()

// const isGzip = require('is-gzip')
// const isZip = require('is-zip');
// const unzipper = require('unzipper')
// // const etl = require('etl')
// const iconv = require('iconv-lite');
// var iso6393 = require('iso-639-3')
// // let decoder = new util.TextDecoder('utf-8')

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

// const convert = require('xml-js')

async function parseZip(fbpath) {
  const directory = await unzipper.Open.file(fbpath)
  const file = directory.files[0]
  return await file.buffer()
}

export async function epub2json(bpath)  {
  const data = await fse.readFile(bpath)
  log('_data', data.length)
  let {content, zfiles} = await zip.loadAsync(data)
    .then(function (zip) {
      // console.log('_ZIP.FILES', zip.files);
      let content = _.find(zip.files, file=> { return /\.opf/.test(file.name) })
      let zfiles = _.filter(zip.files, file=> { return /\.x?html/.test(file.name) }) // \.html, .xhtml
      // zfiles = _.sortBy(zfiles, 'name')
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
          // let author = metadata['dc:creator'][0]._
          let author = metadata['dc:creator']
          let title = metadata['dc:title'][0]
          let lang = metadata['dc:language'][0]
          let descr = {version, author, title, lang}
          log('_descr_', descr)
          return descr
        })
      })
  log('_DESCR', descr)

  // zfiles = zfiles.slice(0, 5)

  Promise.all(zfiles.map(zfile=> {
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
      log('_MD-res:', md)
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
      let mds = md.split('\n').map(md=> md.trim())
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
