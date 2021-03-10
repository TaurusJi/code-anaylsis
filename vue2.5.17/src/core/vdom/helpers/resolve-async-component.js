/* @flow */

import {
  warn,
  once,
  isDef,
  isUndef,
  isTrue,
  isObject,
  hasSymbol
} from 'core/util/index'

import { createEmptyVNode } from 'core/vdom/vnode'

// 适配不同的模块（CommonJS,ES6）导入方式，确保拿到导入的对象
// 如果是object会被转换成构造函数
function ensureCtor (comp: any, base) {
  if (
    comp.__esModule ||
    (hasSymbol && comp[Symbol.toStringTag] === 'Module')
  ) {
    comp = comp.default
  }
  return isObject(comp)
    ? base.extend(comp)
    : comp
}

// 创建异步组件占位符节点
// eg: <!---->
export function createAsyncPlaceholder (
  factory: Function,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag: ?string
): VNode {
  const node = createEmptyVNode()
  node.asyncFactory = factory
  node.asyncMeta = { data, context, children, tag }
  return node
}

export function resolveAsyncComponent (
  factory: Function,
  baseCtor: Class<Component>,
  context: Component
): Class<Component> | void {
  if (isTrue(factory.error) && isDef(factory.errorComp)) {
    return factory.errorComp
  }

  // 如果异步组件已经获取到了，返回异步组件构造函数
  if (isDef(factory.resolved)) {
    return factory.resolved
  }

  if (isTrue(factory.loading) && isDef(factory.loadingComp)) {
    return factory.loadingComp
  }

  if (isDef(factory.contexts)) {
    // already pending
    factory.contexts.push(context)
  } else {
    const contexts = factory.contexts = [context]
    let sync = true

    const forceRender = () => {
      for (let i = 0, l = contexts.length; i < l; i++) {
        contexts[i].$forceUpdate()
      }
    }

    // 异步组件resolve只执行一次
    const resolve = once((res: Object | Class<Component>) => {
      // cache resolved
      // 缓存异步组件构造函数
      factory.resolved = ensureCtor(res, baseCtor)
      // invoke callbacks only if this is not a synchronous resolve
      // (async resolves are shimmed as synchronous during SSR)
      if (!sync) {
        // 通过触发当前vm实例的$forceUpdate方法强制渲染,
        // 因为异步组件和响应式数据之间没有必然的联系,
        // 不会有类似双向绑定之类的操作自动触发渲染,
        // 所以必须手动触发强制渲染。
        //
        // $forceUpdate 会调用当前实例上的渲染watcher的upate方法
        // 从而再次触发createComponent -> 这次createComponent就会拿到异步组件的构造函数
        // 异步组件得以渲染
        forceRender()
      }
    })

    // 异步组件reject只执行一次
    const reject = once(reason => {
      process.env.NODE_ENV !== 'production' && warn(
        `Failed to resolve async component: ${String(factory)}` +
        (reason ? `\nReason: ${reason}` : '')
      )
      if (isDef(factory.errorComp)) {
        factory.error = true
        forceRender()
      }
    })

    // 这里时异步操作，res还没拿到值
    // factory方法 就是webpack定义组件加载的其中一种方式
    /**
     *
     * function ((resolve, reject)) {
     *   require(['./component/HelloWorld.vue'], function (res) => {
     *     resolve(res)
     *   })
     * }
     */
    const res = factory(resolve, reject)

    if (isObject(res)) {
      if (typeof res.then === 'function') {
        // () => Promise
        // promise 异步加载
        if (isUndef(factory.resolved)) {
          res.then(resolve, reject)
        }
      } else if (isDef(res.component) && typeof res.component.then === 'function') {
        // 高级异步组件加载
        res.component.then(resolve, reject)

        // 定义错误组件
        if (isDef(res.error)) {
          factory.errorComp = ensureCtor(res.error, baseCtor)
        }

        // 定义loading组件
        if (isDef(res.loading)) {
          factory.loadingComp = ensureCtor(res.loading, baseCtor)
          if (res.delay === 0) {
            // 没有加载延迟就直接显示loading组件
            factory.loading = true
          } else {
            // 有delay则延迟后渲染loading组件
            setTimeout(() => {
              if (isUndef(factory.resolved) && isUndef(factory.error)) {
                factory.loading = true
                forceRender()
              }
            }, res.delay || 200)
          }
        }

        // 最长等待时间
        if (isDef(res.timeout)) {
          setTimeout(() => {
            // 如果异步结果超时，调用reject后会返回错误组件并渲染
            if (isUndef(factory.resolved)) {
              reject(
                process.env.NODE_ENV !== 'production'
                  ? `timeout (${res.timeout}ms)`
                  : null
              )
            }
          }, res.timeout)
        }
      }
    }

    // sync设置为async异步，因为factory方法是异步方法
    sync = false

    // 如果异步还没结束会返回undefined
    // return in case resolved synchronously
    return factory.loading
      ? factory.loadingComp
      : factory.resolved
  }
}
