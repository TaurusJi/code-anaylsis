import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

// Vue构造函数
function Vue (options) {
  // 必须要用new关键字实例化Vue函数，否则log打出警告
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  // new时会调用这个_init方法初始化
  this._init(options)
}

// 通过这种方式把方法和属性挂载到Vue构造函数上
initMixin(Vue)
// prop/data/computed/method/watch状态初始化
stateMixin(Vue)
// 事件监听
eventsMixin(Vue)
// 生命周期
lifecycleMixin(Vue)
// 渲染
renderMixin(Vue)

// 最后导出
export default Vue
