const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const rollup = require('rollup')
const uglify = require('uglify-js')

if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist')
}

/**
 * 读取配置文件，拿到每一种vue.js的相关的rollup打包配置
 */
let builds = require('./config').getAllBuilds()

// filter builds via command line arg
// npm script执行时会带入参数 eg: npm run build --environment TARGET:web-runtime-cjs
// process.argv[2] -> 'web-runtime-cjs,xxxx,xxxx'
if (process.argv[2]) {
  // -> [web-runtime-cjs, xxxx, xxxx]
  const filters = process.argv[2].split(',')
  // 过滤rollup打包配置单 把不需要打包的配置过滤掉 得到真正想要的配置单
  builds = builds.filter(b => {
    return filters.some(f => b.output.file.indexOf(f) > -1 || b._name.indexOf(f) > -1)
  })
} else {
  // filter out weex builds by default
  builds = builds.filter(b => {
    return b.output.file.indexOf('weex') === -1
  })
}

build(builds)

function build (builds) {
  // 计数
  let built = 0
   // 配置单长度
  const total = builds.length
  const next = () => {
    buildEntry(builds[built]).then(() => {
      built++
       // 递归调用buildEntry打包，直到把配置单里的都打包完
      if (built < total) {
        next()
      }
    }).catch(logError)
  }

  next()
}

function buildEntry (config) {
  const output = config.output
  const { file, banner } = output
  const isProd = /min\.js$/.test(file)
  // rollup编译config
  return rollup.rollup(config)
    .then(bundle => bundle.generate(output))
    .then(({ code }) => {
      // 代码是否需要压缩
      if (isProd) {
        var minified = (banner ? banner + '\n' : '') + uglify.minify(code, {
          output: {
            ascii_only: true
          },
          compress: {
            pure_funcs: ['makeMap']
          }
        }).code
        return write(file, minified, true)
      } else {
        return write(file, code)
      }
    })
}

// 编译过的代码写入文件
function write (dest, code, zip) {
  return new Promise((resolve, reject) => {
    // 打log
    function report (extra) {
      console.log(blue(path.relative(process.cwd(), dest)) + ' ' + getSize(code) + (extra || ''))
      resolve()
    }

    fs.writeFile(dest, code, err => {
      if (err) return reject(err)
      if (zip) {
        zlib.gzip(code, (err, zipped) => {
          if (err) return reject(err)
          report(' (gzipped: ' + getSize(zipped) + ')')
        })
      } else {
        report()
      }
    })
  })
}

// 转kb单位
function getSize (code) {
  return (code.length / 1024).toFixed(2) + 'kb'
}

function logError (e) {
  console.log(e)
}

function blue (str) {
  return '\x1b[1m\x1b[34m' + str + '\x1b[39m\x1b[22m'
}
