const yargs = require('yargs')
const ffmpeg = require('fluent-ffmpeg');
const globby = require('globby')
const Spinner = require('cli-spinner').Spinner
const eachLimit = require('async/eachLimit')
const winston = require('winston').cli()

const path = require('path')
const fs = require('fs')

const argv = yargs.argv

const defaults = { cover: 'Cover.jpg', parallel: 5 }

yargs
  .usage('Usage: $0 -d /some/dir [options]')
  .alias('d', 'dir')
  .alias('c', 'cover')
  .alias('o', 'output')
  .alias('p', 'parallel')
  .alias('m', 'metadata')
  .alias('h', 'help')
  .describe('d', 'Directory with mp3 files to convert')
  .describe('c', 'Cover file to use. Defaults to Cover.jpg')
  .describe('o', 'Output directory. Defaults to the input directory')
  .describe('p', 'How many files to convert in parallel. Defaults to 5')
  .describe('m', 'Whether to get metadata and name the file "[Artist] - [Title]". Defaults to false')
  .demandOption('d')
  .example('$0 -d /some/dir/with/mp3s -p 15', 'converts all mp3s to mp4 using Cover.jpg while processing 15 files in parallel')
  .example('$0 -d /some/dir/with/mp3s -c front.jpg', 'converts all mp3s to mp4 using font.jpg')
  .example('$0 -d /some/dir/with/mp3s -m', 'converts all mp3s to mp4 using their metadata to name the output [Artist] - [Title]')
  .example('$0 -d /some/dir/with/mp3s -o /some/output/dir', 'converts all mp3s to mp4 using the specified output directory')
  .help('h')
  .epilog('copyright 2017 Bastian Ahrens')
  .argv

function Converter(options) {
  this.metadata       = options.m
  this.cover          = options.c ? path.basename(options.c) : defaults.cover
  this.directory      = options.d
  this.outputDir      = options.o || this.directory
  this.parallel       = options.p || defaults.parallel
  this.finishedFiles  = []
  this.files          = []

  this.spinner = new Spinner({
    text: `    %s    Finished files: `,
    onTick: msg => {
      this.spinner.clearLine(this.spinner.stream)
      this.spinner.stream.write(`${msg} ${this.finishedFiles.length}/${this.files.length}`)
    }
  })
  this.spinner.setSpinnerString(18)
}

Converter.prototype.scanFiles = function() {
  const mp3Pattern = path.join(this.directory, '*.mp3')
  this.cover = path.join(this.directory, this.cover)

  return globby(mp3Pattern).then(files => {
    if (!files || !files.length) throw new Error("Invalid directory. Either it does no exist or there are no mp3s in it.")
    if (!fs.existsSync(this.cover)) throw new Error(`"${this.cover}" does not exist`)

    return this.files = files
  })
}

Converter.prototype.startConverting = function () {
  this.spinner.start()

  winston.info(`MP3 files found: ${this.files.length}`)
  winston.info(`Background image: ${this.cover}`)
  winston.info(`Output directory: ${this.outputDir}`)
  winston.info(`Processing ${this.parallel} files in parallel`)

  const getMetaAndConvert = this.getMetaAndConvert.bind(this)

  eachLimit(this.files, this.parallel, getMetaAndConvert, err => {
    if (err) throw err

    this.spinner.stop()
    this.spinner.clearLine(this.spinner.stream)

    winston.info(`${this.finishedFiles.length} files converted. Cyaaa!`)
    process.exit(1)
  })
}

Converter.prototype.getMetaAndConvert = function(file, callback) {
  const withMetadata = () => this.getMetadata(file)
  .then(metadata => this.convertFile(file, metadata))

  const withoutMetadata = () => this.convertFile(file)

  const execute = this.metadata ? withMetadata : withoutMetadata

  execute()
  .then(file => this.finishedFiles.push(file))
  .then(() => callback(null))
  .catch(err => callback(err))
}

Converter.prototype.convertFile = function(file, meta ) {
  const filename = path.basename(file).replace(/\.[^/.]+$/, "")
  let outputFile = `${this.outputDir}${filename}.mp4`

  if (meta) {
    const { bit_rate, tags: { artist, title } } = meta
    outputFile = `${this.outputDir}${artist} - ${title}.mp4`
  }

  return new Promise((resolve, reject) => {
    const ff = ffmpeg()
    .addInput(file)
    .addInput(this.cover)
    .on('error', err => reject)
    .on('end',    () => resolve(file))
    .format('mp4')

    if (this.metadata && meta) ff.audioBitrate(meta.bit_rate)

    ff.save(outputFile)
  })
}

Converter.prototype.getMetadata = function(file) {
  return new Promise((resolve, reject) => {
    ffmpeg(file)
    .ffprobe((err, data) => {
      if (err) reject(err)
      else resolve(data.format)
    })
  })
}

const converter = new Converter(argv)
converter.scanFiles()
.then(() => converter.startConverting())
.catch(err => winston.error(err.message))
