/* @flow */

// 用来调用所有收集到的路由钩子函数的函数
// fn就是base.js里的iterator函数
export function runQueue (queue: Array<?NavigationGuard>, fn: Function, cb: Function) {
  const step = index => {
    // 都执行完了，就调用回调
    if (index >= queue.length) {
      cb()
    } else {
      // 存在就调用，不存在就下一个
      if (queue[index]) {
        fn(queue[index], () => {
          step(index + 1)
        })
      } else {
        step(index + 1)
      }
    }
  }
  step(0)
}
