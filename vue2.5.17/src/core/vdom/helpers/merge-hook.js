/* @flow */

import VNode from '../vnode'
import { createFnInvoker } from './update-listeners'
import { remove, isDef, isUndef, isTrue } from 'shared/util'

// def一般是节点VNode，key是hook的键，hook是需要与钩子函数合并的函数
export function mergeVNodeHook (def: Object, hookKey: string, hook: Function) {
  // 主要判断hook字段存不存在，不存在就给个默认的对象
  if (def instanceof VNode) {
    def = def.data.hook || (def.data.hook = {})
  }
  let invoker
  const oldHook = def[hookKey]

  function wrappedHook () {
    hook.apply(this, arguments)
    // important: remove merged hook to ensure it's called only once
    // and prevent memory leak
    remove(invoker.fns, wrappedHook)
  }

  if (isUndef(oldHook)) {
    // no existing hook
    invoker = createFnInvoker([wrappedHook])
  } else {
    /* istanbul ignore if */
    if (isDef(oldHook.fns) && isTrue(oldHook.merged)) {
      // 如果之前已经有过合并操作，那就push到函数上的fns数组里
      // already a merged invoker
      invoker = oldHook
      invoker.fns.push(wrappedHook)
    } else {
      // 否则就执行合并操作，实际上合并操作就是执行这个方法时传个数组
      // existing plain hook
      invoker = createFnInvoker([oldHook, wrappedHook])
    }
  }

  // 打上合并过的标记
  invoker.merged = true
  def[hookKey] = invoker
}
