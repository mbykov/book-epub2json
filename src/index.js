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
    return '[' + content + '](' + node.id + ')'
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
  let {content, tocfile, imgfiles, zfiles} = await zip.loadAsync(data)
    .then(function (zip) {
      let tocfile = _.find(zip.files, file=> { return /toc.ncx/.test(file.name) })
      let imgfiles = _.filter(zip.files, zfile=> /image/.test(zfile.name))
      let imgnames = imgfiles.map(imgfile=> imgfile.name)
      log('__IMG', imgnames.length)
      // let imgnames = imgfiles.map(imgfile=> imgfile.name)

      let content = _.find(zip.files, file=> { return /\.opf/.test(file.name) })
      let zfiles = _.filter(zip.files, file=> { return /\.x?html?/.test(file.name) }) // \.html, .xhtml
      return {content, tocfile, imgfiles, zfiles}
    })
  // log('_ZFILES_:', zfiles.length)

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
  // log('_TOCS_:', tocs.slice(0, 10))

  let descr = await content
      .async('text')
      .then(data=> {
        return xml2js.parseStringPromise(data).then(function (content) {
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
  // log('_DESCR', descr)

  let mds = await html2md(zfiles)
  const imgs = await img2files(zfiles)

  // let znames = mds.map(md=> md.zname)
  // log('_ZNAMES_:', znames.length)

  let ordered = md2toc(tocs, mds)
  log('_ORDERED_:', ordered.length)
  return {descr, mds: ordered, imgs}
}

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
      let md = tdn.turndown(html, tdnopts)
      // [1](dummy_split_005.html#filepos16920) some text // calibre stuff
      // [[1]](dummy_split_033.html#filepos927831) some text // calibre stuff
      // [[1](filepos16920)](dummy_split_033.html#filepos927831)
      // md = md.replace(/(\[[^\]]*\])(\([^\)]*\))/g, "$1") // reference in line
      // md = md.replace(/^(\[[^\]]\])/, "$1:") // beginning of other line
      let mds = md.split('\n')
      mds = mds.map(md=> cleanText(md.trim()))
      mds = mds.filter(md => !/header:/.test(md))
      mds = mds.filter(md => md)
      let zname = _.last(zfile.name.split(/[@\/]/))

      let refs = mds.filter(md => /^\[/.test(md))
      if (refs.length) log('_REFS', zname, refs.length)
      if (zname == 'dummy_split_033.html') {
        log('_Z', zname, 22, refs.length, 33, mds.length)
      }

      return {zname: zname, mds: mds}
    })
}

function md2toc(tocs, mds) {
  let ordered = []
  let title = ['#', 'title'].join(' ')
  ordered.push(title)
  tocs.forEach((toc, idx)=> {
    let pathnum = idx+1
    let file  = mds.find(file=> toc.src.split(file.zname).length > 1)
    if (!file) {
      log('_no file toc.src:_', toc) // ============= todo : убрать Err
      throw new Error()
    }
    let head = ['##', toc.navlabel].join(' ')
    log('_H', head, '->', file.zname)
    ordered.push(head)
    file.mds.forEach(md=> {
      let level, path = '01', ppath, restring
      md = md.trim()
      if (!md) return
      if (/^#/.test(md)) {
        // level = md.match(/#/g).length
        md = md.replace(/#/g, '').trim()
        md = ['**', md, '**'].join('')
      }
      if (/^\[/.test(md)) { // refs
        log('_REF', md)
        ppath = (pathnum <= 9) ? '0' + pathnum.toString() : pathnum.toString()
        path += ppath
        restring = '$1: (section-path: ' + ppath + ')'
        md = md.replace(/^(\[[^\]]\])/, restring)
      }
      ordered.push(md)
    })
  })
  // zname: 'OEBPS/hp05_ch026_en-us.html'
  // { playOrder: '13', src: 'hp05_ch007_en-us.html' },
  return ordered
}

// https://www.utf8-chartable.de/unicode-utf8-table.pl?start=8192&number=128
function cleanText(str) {
  let clean = str.replace(/\s\s+/g, ' ') // .replace(/—/g, ' - ').replace(/’/g, '\'')
  return clean
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
