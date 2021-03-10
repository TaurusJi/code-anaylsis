/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

export function initGlobalAPI (Vue: GlobalAPI) {
  // config
  const configDef = {}
  // Vue全局API通过config内flow定义的type获取
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  // 仅仅针对Vue内部使用的工具函数，不对外公布
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }

  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  // options初始化 ASSET_TYPES: {'component','directive','filter'}
  Vue.options = Object.create(null)
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  // 往自身的options上挂载一个Vue构造函数
  Vue.options._base = Vue

  // builtInComponents时keep-alive 通过extend扩展到Vue.options.components上
  extend(Vue.options.components, builtInComponents)

  // 定义use方法
  initUse(Vue)
  // 定义mixin方法
  initMixin(Vue)
  // 定义extend方法
  initExtend(Vue)
  // 把ASSET_TYPES里的字段初始化为全局API
  initAssetRegisters(Vue)
}
