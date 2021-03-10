/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
export default class Dep {
  // Dep.target是当前渲染watcher的实例
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++
    this.subs = []
  }

  // 被订阅的渲染watcher会被收集到subs数组中
  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  depend () {
    if (Dep.target) {
      // 调用了watcher实例的addDep方法 传入Dep实例
      // 实际就相当于把Dep.target保存的当前的渲染watcher push到了subs数组里作为订阅者
      Dep.target.addDep(this)
    }
  }

  notify () {
    // stabilize the subscriber list first
    // 调用watcher的update方法
    const subs = this.subs.slice()
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// the current target watcher being evaluated.
// this is globally unique because there could be only one
// watcher being evaluated at any time.
// Dep.target静态属性只有一个
// 但是每个响应式属性都有一个自己的Dep实例
Dep.target = null
const targetStack = []

// 此处即为依赖收集
export function pushTarget (_target: ?Watcher) {
  // 渲染watcher的实例以栈的形式被push至数组，形成渲染watcher的调用栈
  // Dep.target这个静态属性保存的是当前触发getter方法的watcher
  if (Dep.target) targetStack.push(Dep.target)
  Dep.target = _target
}

export function popTarget () {
  Dep.target = targetStack.pop()
}
