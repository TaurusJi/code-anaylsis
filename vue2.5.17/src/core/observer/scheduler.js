/* @flow */

import type Watcher from './watcher'
import config from '../config'
import { callHook, activateChildComponent } from '../instance/lifecycle'

import {
  warn,
  nextTick,
  devtools
} from '../util/index'

export const MAX_UPDATE_COUNT = 100

const queue: Array<Watcher> = []
const activatedChildren: Array<Component> = []
let has: { [key: number]: ?true } = {}
let circular: { [key: number]: number } = {}
let waiting = false
let flushing = false
let index = 0

/**
 * Reset the scheduler's state.
 */
// 重置调度属性
function resetSchedulerState () {
  index = queue.length = activatedChildren.length = 0
  has = {}
  if (process.env.NODE_ENV !== 'production') {
    circular = {}
  }
  waiting = flushing = false
}

/**
 * Flush both queues and run the watchers.
 */
function flushSchedulerQueue () {
  flushing = true
  let watcher, id

  // Sort queue before flush.
  // This ensures that:
  // 组件的创建由父至子，所以父watcher要在前
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child)
  // 用户创建的组件中的watcher要在前
  // 2. A component's user watchers are run before its render watcher (because
  //    user watchers are created before the render watcher)
  // 如果在父组件的watcher回调期间删除了某个子组件，子组件得watcher不会被执行
  // 3. If a component is destroyed during a parent component's watcher run,
  //    its watchers can be skipped.
  queue.sort((a, b) => a.id - b.id)

  // do not cache length because more watchers might be pushed
  // as we run existing watchers
  // length不能被缓存，因为watcher.run执行时可能会再次调用queueWatcher，导致queue.length得长度发生改变
  // 注意 这里得index定义在函数外，为了在queueWatcher执行时能拿得到当前被遍历得index
  for (index = 0; index < queue.length; index++) {
    watcher = queue[index]
    id = watcher.id
    has[id] = null
    watcher.run()
    // in dev build, check and stop circular updates.
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1
      if (circular[id] > MAX_UPDATE_COUNT) {
        warn(
          'You may have an infinite update loop ' + (
            watcher.user
              ? `in watcher with expression "${watcher.expression}"`
              : `in a component render function.`
          ),
          watcher.vm
        )
        break
      }
    }
  }

  // keep copies of post queues before resetting state
  const activatedQueue = activatedChildren.slice()
  const updatedQueue = queue.slice()

  resetSchedulerState()

  // call component updated and activated hooks
  // 递归执行队列里每个组件的子组件的activated生命周期
  callActivatedHooks(activatedQueue)
  // 调用update钩子
  callUpdatedHooks(updatedQueue)

  // devtool hook
  /* istanbul ignore if */
  if (devtools && config.devtools) {
    devtools.emit('flush')
  }
}

function callUpdatedHooks (queue) {
  let i = queue.length
  while (i--) {
    const watcher = queue[i]
    const vm = watcher.vm
    // 满足: vm实例已经mounted，watcher必须是渲染watcher所以首次渲染不会调用update
    if (vm._watcher === watcher && vm._isMounted) {
      callHook(vm, 'updated')
    }
  }
}

/**
 * Queue a kept-alive component that was activated during patch.
 * The queue will be processed after the entire tree has been patched.
 */
export function queueActivatedComponent (vm: Component) {
  // setting _inactive to false here so that a render function can
  // rely on checking whether it's in an inactive tree (e.g. router-view)
  vm._inactive = false
  activatedChildren.push(vm)
}

function callActivatedHooks (queue) {
  for (let i = 0; i < queue.length; i++) {
    queue[i]._inactive = true
    activateChildComponent(queue[i], true /* true */)
  }
}

/**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 */
export function queueWatcher (watcher: Watcher) {
  const id = watcher.id
  // 同一个watcher只会push一次到队列中
  if (has[id] == null) {
    has[id] = true
    if (!flushing) {
      queue.push(watcher)
    } else {
      // if already flushing, splice the watcher based on its id
      // if already past its id, it will be run next immediately.
      // 只有调度运行时才会执行到else
      // i为队列最后一位索引
      let i = queue.length - 1
      // index为flushSchedulerQueue执行时循环的当前索引
      // 如果最后一位索引大于当前循环索引 且 最后一位索引对应得watcher.id大于当前传入的watcher的id
      while (i > index && queue[i].id > watcher.id) {
        i--
      }
      // 这里的意思是把这个watcher插入到当前queue中正处于要执行状态的watcher的后面一位
      queue.splice(i + 1, 0, watcher)
    }
    // queue the flush
    // waiting保证flushSchedulerQueue方法只执行一次
    if (!waiting) {
      waiting = true
      nextTick(flushSchedulerQueue)
    }
  }
}
