'use strict'

const _ = require('lodash')
const fse = require('fs-extra')
const path = require("path")
const log = console.log
const util = require("util")
// new:
const zip = require("jszip")
const xml2js = require('xml2js')
const iso6393 = require('iso-639-3')

let insp = (o) => log(util.inspect(o, false, null))

const tdnopts = {
  linkStyle: 'inlined', // inlined or referenced
  linkReferenceStyle: 'full' // full, collapsed, or shortcut
}

// const Turndown = require('turndown')
import Turndown from 'turndown'
const tdn = new Turndown(tdnopts)

let rulesup = {
  filter: 'sup',
  replacement: function (content, node) {
    // return '[' + content + '](' + node.id + ')'
    return content + ':' + node.id
  }
}
tdn.addRule('sup', rulesup)

export async function epub2md(bpath)  {
  let data
  try {
    data = await fse.readFile(bpath)
  } catch(err) {
    let mess = 'wrong epub file' + bpath
    return {descr: mess}
  }
  let {cont, content, tocfile, imgfiles, zfiles} = await zip.loadAsync(data)
    .then(function (zip) {
      let cont = _.find(zip.files, file=> { return /container.xml/.test(file.name) })
      // log('__Z_CONTAINER', cont)
      let tocfile = _.find(zip.files, file=> { return /toc.ncx/.test(file.name) })
      let imgfiles = _.filter(zip.files, zfile=> /image/.test(zfile.name))
      log('__ZIP-keys', _.keys(zip))
      let zfnames = _.map(zip.files, zfile=> zfile.name)
      log('__Z_FILE_NAMES', zfnames.length)
      let imgnames = imgfiles.map(imgfile=> imgfile.name)
      log('__IMG', imgnames.length)
      // let imgnames = imgfiles.map(imgfile=> imgfile.name)

      let content = _.find(zip.files, file=> { return /\.opf/.test(file.name) })
      let zfiles = _.filter(zip.files, file=> { return /\.x?html?/.test(file.name) }) // \.html, .xhtml
      return {cont, content, tocfile, imgfiles, zfiles}
    })
  // log('_ZFILES_:', zfiles.length)

  let container = await cont
      .async('text')
      .then(data=> {
        return xml2js.parseStringPromise(data).then(function (contdata) {
          return contdata.container.rootfiles[0].rootfile
          // let navMap = tocdata.ncx.navMap
          // let navPoint = navMap[0].navPoint
          // let tocs = navPoint.map(row=> {
            // return {playOrder: row.$.playOrder, src: row.content[0].$.src, navlabel: row.navLabel[0].text.toString(), cnt: row.content[0].$}
          // })
          // return tocs
        })
      })
  // log('_CONTAINER_:', container)

  let descr = await content
      .async('text')
      .then(data=> {
        return xml2js.parseStringPromise(data).then(function (content) {
          // todo: manifest = content.package.manifest[0].item - true content, {href, id, media-type}
          let version = content.package.$.version
          let metadata = content.package.metadata[0]
          let author = '', title = '', lang = ''
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
          let descr = {type: 'epub', version, author, title, lang}
          return descr
        })
      })
  log('_DESCR', descr)

  let tocs = await tocfile
      .async('text')
      .then(data=> {
        return xml2js.parseStringPromise(data).then(function (tocdata) {
          let navMap = tocdata.ncx.navMap
          let navPoint = navMap[0].navPoint
          let tocs = navPoint.map(row=> {
            return {playOrder: row.$.playOrder, src: row.content[0].$.src, navlabel: row.navLabel[0].text.toString(), cnt: row.content[0].$}
          })
          return tocs
        })
      })
  // log('_TOCS_:', tocs)
  // tocs = tocs.filter(toc=> /_023/.test(toc.src))
  log('_TOCS_:', tocs)

  let mds = await html2md(zfiles)
  const imgs = await img2files(zfiles)

  let mdnames = mds.map(md=> md.zname)
  log('_MDNAMES_:', mdnames)

  // return {descr, mds, imgs} // ====================================== убрать

  let ordered = md2toc(tocs, mds)
  log('_ORDERED_:', ordered.length)
  return {descr, mds: ordered, imgs}
}

function md2toc(tocs, filemds) {
  let ordered = []
  let title = ['#', 'title'].join(' ')
  ordered.push(title)
  tocs.forEach((toc, idx)=> {
    let file  = filemds.find(file=> toc.src.split(file.zname).length > 1)
    if (!file) {
      log('_no file toc.src:_', toc) // ============= todo : убрать Err
      throw new Error()
    }
    if (!file.added) {
      ordered.push(...file.mds)
      file.added = true
    }
  }) // tocs
  ordered.push('_______NOTES_______')
  let filenotes = filemds.filter(file=> !file.added)
  filenotes.forEach(file=> {
    let notes = file.mds.filter(md=> /^\[/.test(md))
    ordered.push(...notes)
  })

  return ordered
}

// ==== значит, вернуться к 2json, а book-json-utils подгружать везде ====================== XXX
// здесь я получу верный path
// == алгоритм:
// _toc -> mds -> docs
// затем снова docs -> поиск refs - заполнение refkey, -> генерация ref-path-number
//

async function html2md(zfiles) {
  return await Promise.all(zfiles.map(zfile=> {
    return getMD(zfile)
  }))
    .then(res=> {
      res = _.compact(res)
      return res
    })
}

function getMD(zfile) {
  return zfile
    .async('text')
    .then(html => {
      html = html.split(/<body[^>]*>/)[1]
      if (!html) return
      html = html.split(/<\/body>/)[0]
      // log('_HTML', html)

      // <a href="dummy_split_033.html#filepos1130550" class="calibre9"><sup id="filepos841754" class="calibre19">1</sup></a>
      // <p id="filepos1130550" class="calibre18"><a href="dummy_split_025.html#filepos841754" class="calibre9">1</a> Mahabharata, XII.72.20.</p>

      let md = tdn.turndown(html, tdnopts)
      md = cleanStr(md.trim())
      // [1](dummy_split_005.html#filepos16920) some text // calibre stuff
      // [[1]](dummy_split_033.html#filepos927831) some text // calibre stuff
      // [[1](filepos16920)](dummy_split_033.html#filepos927831)
      // md = md.replace(/(\[[^\]]*\])(\([^\)]*\))/g, "$1") // reference in line
      // md = md.replace(/^(\[[^\]]\])/, "$1:") // beginning of other line
      let mds = md.split('\n')
      // mds = mds.map(md=> cleanText(md.trim()))
      // mds = mds.map(md=> cleanStr(md.trim()))
      // mds = mds.filter(md => !/header:/.test(md))
      // mds = mds.filter(md => md)
      let zname = _.last(zfile.name.split(/[@\/]/))

      // let refs = mds.filter(md => /^\[/.test(md))
      // if (refs.length) log('_REFS', zname, refs.length)
      // if (zname == 'dummy_split_033.html') {
      //   log('_Z', zname, 22, refs.length, 33, mds.length)
      // }

      return {zname: zname, mds: mds}
    })
}

// https://www.utf8-chartable.de/unicode-utf8-table.pl?start=8192&number=128
function cleanText(str) {
  let clean = str.replace(/\s\s+/g, ' ') // .replace(/—/g, ' - ').replace(/’/g, '\'')
  return clean
}

export function cleanStr(str) {
  return str.replace(/\n+/g, '\n').replace(/↵+/, '\n').replace(/  +/, ' ') // .replace(/\s+/, ' ')
}

async function img2files(imgfiles) {
  let dirpath = path.resolve(__dirname, '../images')
  fse.ensureDir(dirpath)
  // log('___imgpath:', dirpath)
  return await Promise.all(imgfiles.map(zfile=> {
    // return getImage(zfile)
    return null
  }))
    .then(imgs=> {
      imgs = _.compact(imgs)
      return imgs
    })
}

// function getImage(imgfile) {
//   return imgfile
//     .async('arraybuffer')
//     .then(imgcontent=> {
//       // log('_imgc:', imgcontent)
//       let buffer = new Uint8Array(imgcontent)
//       let blob = new Blob([buffer.buffer])
//       // console.log(blob);
//       let img = new Image
//       let imgpath = path.resolve(__dirname, 'images')
//       log('_imgpath:', imgpath)
//       // fse.writeFileSync(imgpath, img)
//       img.src = URL.createObjectURL(blob)
//       return img
//     })
// }

// export function epubImage(fn) { d
//   return checkEpub()
//     .then(res=> {
//       // log('_________________ GET EPUB IMG:', res, epubzip, fn)
//       let imgzip = _.find(epubzip.files, file=> { return file.name == fn })
//       return imgzip
//         .async('arraybuffer')
//         .then(content=> {
//           console.log(content);
//           let buffer = new Uint8Array(content)
//           let blob = new Blob([buffer.buffer])
//           // console.log(blob);
//           let img = new Image
//           img.src = URL.createObjectURL(blob)
//           return img
//         })
//       // let imgpath = path.resolve(__dirname, '../images', _.last(imgfile.name.split('/')))
//       let buffer = new Uint8Array(imgcontent)
//       // fse.writeFileSync(imgpath, buffer)
//       let imgname = _.last(imgfile.name.split(/[\/@]/) )
//       return {name: imgname, data: buffer}
//     })
// }
//
