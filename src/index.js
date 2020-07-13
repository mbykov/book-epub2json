//

const _ = require('lodash')
const fse = require('fs-extra')
const path = require("path")
const log = console.log
const util = require("util")

// new:
const zip = require("jszip")
const xml2js = require('xml2js')

// const isGzip = require('is-gzip')
// const isZip = require('is-zip');
// const unzipper = require('unzipper')
// // const etl = require('etl')
// const iconv = require('iconv-lite');
// var iso6393 = require('iso-639-3')
// // let decoder = new util.TextDecoder('utf-8')

let insp = (o) => log(util.inspect(o, false, null))

// const convert = require('xml-js')

async function parseZip(fbpath) {
  const directory = await unzipper.Open.file(fbpath)
  const file = directory.files[0]
  return await file.buffer()
}

export async function epub2json(bpath)  {
  const data = await fse.readFile(bpath)
  log('_data', data.length)
  const {content, zfiles} = await zip.loadAsync(data)
    .then(function (zip) {
      // console.log('_ZIP.FILES', zip.files);
      let content = _.find(zip.files, file=> { return /\.opf/.test(file.name) })
      let zfiles = _.filter(zip.files, file=> { return /\.xhtml/.test(file.name) }) // \.html, .xhtml
      // zfiles = _.sortBy(zfiles, file=> { return file.name })
      // zfiles.forEach((file, idx)=> { file.idx = idx})
      // zfiles.unshift(content)
      // log('content:', content)
      // log('_zfiles:', zfiles)
      return {content, zfiles}
    })
  log('_after-cont:', content)
  log('_after-zfiles:', zfiles)

  content
    .async('text')
    .then(data=> {
      return xml2js.parseStringPromise(data).then(function (jsonObj) {
        // return jsonObj
        log('__CONT-jsonObj', jsonObj)
      })

    })
  // Promise.all(zfiles.map(zfile=> {
    // return getMD(zfile)
  // }))

}

function getMD(zfile) {
  return zfile
    .async('text')
    .then(data => {
      if (/content.opf/.test(zfile.name)) {
        return xml2js.parseStringPromise(data).then(function (jsonObj) {
          return jsonObj
        })
      } else {
        let md = tdn.turndown(data).trim()
        return {idx: zfile.idx, name: zfile.name, md: md}
      }
    })
}




function cleanText(str) {
  if (!str) return ''
  let clean = str.replace(/\s\s+/g, ' ')
  return clean
}
