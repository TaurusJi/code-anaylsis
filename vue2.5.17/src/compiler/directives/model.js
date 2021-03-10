/* @flow */

/**
 * Cross-platform code generation for component v-model
 * 组件v-model的解析方法
 */
export function genComponentModel (
  el: ASTElement,
  value: string,
  modifiers: ?ASTModifiers
): ?boolean {
  const { number, trim } = modifiers || {}

  const baseValueExpression = '$$v'
  let valueExpression = baseValueExpression
  if (trim) {
    valueExpression =
      `(typeof ${baseValueExpression} === 'string'` +
      `? ${baseValueExpression}.trim()` +
      `: ${baseValueExpression})`
  }
  if (number) {
    valueExpression = `_n(${valueExpression})`
  }
  // 这里生成的就是v-model赋值的代码
  const assignment = genAssignmentCode(value, valueExpression)

  el.model = {
    value: `(${value})`,
    expression: `"${value}"`,
    callback: `function (${baseValueExpression}) {${assignment}}`
  }
}

/**
 * Cross-platform codegen helper for generating v-model value assignment code.
 */
export function genAssignmentCode (
  value: string,
  assignment: string
): string {
  const res = parseModel(value)
  if (res.key === null) {
    // 没有key就等号赋值
    return `${value}=${assignment}`
  } else {
    // 如果有key就调用vm.$set方法修改属性
    return `$set(${res.exp}, ${res.key}, ${assignment})`
  }
}

/**
 * Parse a v-model expression into a base path and a final key segment.
 * Handles both dot-path and possible square brackets.
 *
 * Possible cases:
 *
 * - test
 * - test[key]
 * - test[test1[key]]
 * - test["a"][key]
 * - xxx.test[a[a].test1[key]]
 * - test.xxx.a["asa"][test1[key]]
 *
 */

let len, str, chr, index, expressionPos, expressionEndPos

type ModelParseResult = {
  exp: string,
  key: string | null
}

export function parseModel (val: string): ModelParseResult {
  // Fix https://github.com/vuejs/vue/pull/7730
  // allow v-model="obj.val " (trailing whitespace)
  val = val.trim()
  len = val.length

  if (val.indexOf('[') < 0 || val.lastIndexOf(']') < len - 1) {
    index = val.lastIndexOf('.')
    // example: v-model="obj.data.input"
    // 绑定的值有深度，则exp为值的深度路径obj.data
    // key就是input
    if (index > -1) {
      return {
        exp: val.slice(0, index),
        key: '"' + val.slice(index + 1) + '"'
      }
    } else {
      return {
        exp: val,
        key: null
      }
    }
  }

  // 能走到这儿说明绑定的表达式里有括号
  str = val
  index = expressionPos = expressionEndPos = 0

  while (!eof()) {
    chr = next()
    /* istanbul ignore if */
    if (isStringStart(chr)) {
      parseString(chr)
    } else if (chr === 0x5B) {
      // 解析括号"[]"索引位置
      parseBracket(chr)
    }
  }

  // example: v-model="obj.data.input[0]"
  // exp: obj.data.input
  // key: 0
  return {
    exp: val.slice(0, expressionPos),
    key: val.slice(expressionPos + 1, expressionEndPos)
  }
}

// 字符串转十进制
function next (): number {
  return str.charCodeAt(++index)
}

// eof是end of file的简写
// 表示"文字流"（stream）的结尾
function eof (): boolean {
  return index >= len
}

function isStringStart (chr: number): boolean {
  // 0x22的十进制是34 fromCharCode后得到 "
  // 0x27的十进制是39 fromCharCode后得到 '
  return chr === 0x22 || chr === 0x27
}

function parseBracket (chr: number): void {
  let inBracket = 1
  expressionPos = index
  while (!eof()) {
    // 表达式索引对应的字符串的十进制
    chr = next()
    if (isStringStart(chr)) {
      parseString(chr)
      continue
    }
    // 0x5B的十进制是91 fromCharCode(91) 得到 '['
    if (chr === 0x5B) inBracket++
    // 0x5D的十进制是93 fromCharCode(93) 得到 ']'
    if (chr === 0x5D) inBracket--
    if (inBracket === 0) {
      expressionEndPos = index
      break
    }
  }
}

function parseString (chr: number): void {
  const stringQuote = chr
  while (!eof()) {
    chr = next()
    if (chr === stringQuote) {
      break
    }
  }
}
