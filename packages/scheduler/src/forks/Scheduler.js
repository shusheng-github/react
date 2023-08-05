/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* eslint-disable no-var */

import {
  enableSchedulerDebugging,
  enableProfiling,
  enableIsInputPending,
  enableIsInputPendingContinuous,
  frameYieldMs,
  continuousYieldMs,
  maxYieldMs,
} from '../SchedulerFeatureFlags';

import {push, pop, peek} from '../SchedulerMinHeap';

// TODO: Use symbols?
import {
  ImmediatePriority,
  UserBlockingPriority,
  NormalPriority,
  LowPriority,
  IdlePriority,
} from '../SchedulerPriorities';
import {
  markTaskRun,
  markTaskYield,
  markTaskCompleted,
  markTaskCanceled,
  markTaskErrored,
  markSchedulerSuspended,
  markSchedulerUnsuspended,
  markTaskStart,
  stopLoggingProfilingEvents,
  startLoggingProfilingEvents,
} from '../SchedulerProfiling';

let getCurrentTime;
const hasPerformanceNow =
  typeof performance === 'object' && typeof performance.now === 'function';

if (hasPerformanceNow) {
  const localPerformance = performance;
  getCurrentTime = () => localPerformance.now();
} else {
  const localDate = Date;
  const initialTime = localDate.now();
  getCurrentTime = () => localDate.now() - initialTime;
}

// Max 31 bit integer. The max integer size in V8 for 32-bit systems.
// Math.pow(2, 30) - 1
// 0b111111111111111111111111111111
var maxSigned31BitInt = 1073741823;

// Times out immediately
var IMMEDIATE_PRIORITY_TIMEOUT = -1;
// Eventually times out
var USER_BLOCKING_PRIORITY_TIMEOUT = 250;
var NORMAL_PRIORITY_TIMEOUT = 5000;
var LOW_PRIORITY_TIMEOUT = 10000;
// Never times out
var IDLE_PRIORITY_TIMEOUT = maxSigned31BitInt;

// Tasks are stored on a min heap
// Tasks是使用了一个最小堆(小顶堆)的算法逻辑
// 最小堆是一个特殊的二叉树，顶部节点为最小值，每个结点的结点值都不大于其左右孩子的结点值
var taskQueue = []; //存储的是已过期任务
var timerQueue = []; //存储的是未过期任务

// Incrementing id counter. Used to maintain insertion order.
var taskIdCounter = 1;

// Pausing the scheduler is useful for debugging.
var isSchedulerPaused = false;

var currentTask = null;
var currentPriorityLevel = NormalPriority;

// This is set while performing work, to prevent re-entrance.
var isPerformingWork = false;

var isHostCallbackScheduled = false;
var isHostTimeoutScheduled = false;

// Capture local references to native APIs, in case a polyfill overrides them.
const localSetTimeout = typeof setTimeout === 'function' ? setTimeout : null;
const localClearTimeout =
  typeof clearTimeout === 'function' ? clearTimeout : null;
const localSetImmediate =
  typeof setImmediate !== 'undefined' ? setImmediate : null; // IE and Node.js + jsdom

  // 简单来说，advanceTimers 的作用是将 timerTask 中已经到了执行时间的 task，push 到 taskQueue
// 所以这是一个根据当前时间整理两个 Queue 中时序任务的函数，会在 Scheduler 的运作过程中反复调用
const isInputPending =
  typeof navigator !== 'undefined' &&
  navigator.scheduling !== undefined &&
  navigator.scheduling.isInputPending !== undefined
    ? navigator.scheduling.isInputPending.bind(navigator.scheduling)
    : null;

const continuousOptions = {includeContinuous: enableIsInputPendingContinuous};

function advanceTimers(currentTime) {
  // Check for tasks that are no longer delayed and add them to the queue.
  // 检查不再延迟的任务并将它们添加到队列中。
  let timer = peek(timerQueue);
  while (timer !== null) {
    if (timer.callback === null) {
      // Timer was cancelled.
      pop(timerQueue);
    } else if (timer.startTime <= currentTime) { //如果任务已经过期，那么将 timerQueue 中的过期任务，放入taskQueue
      // Timer fired. Transfer to the task queue.
      // 定时器启动。 转移到任务队列。
      pop(timerQueue);
      timer.sortIndex = timer.expirationTime;
      push(taskQueue, timer);
      if (enableProfiling) {
        markTaskStart(timer, currentTime);
        timer.isQueued = true;
      }
    } else {
      // Remaining timers are pending.
      return;
    }
    timer = peek(timerQueue);
  }
}

//  handleTimeout 会把任务重新放在 requestHostCallback 调度。
function handleTimeout(currentTime) {
  isHostTimeoutScheduled = false;
  // 将 timeQueue 中过期的任务，放在 taskQueue 中 
  advanceTimers(currentTime);

  if (!isHostCallbackScheduled) {
    //  判断有没有过期的任务，
    if (peek(taskQueue) !== null) {
      isHostCallbackScheduled = true;
      // 有过期的任务，则开启调度任务
      requestHostCallback(flushWork);
    } else {
      const firstTimer = peek(timerQueue);
      if (firstTimer !== null) {
        requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
      }
    }
  }
}

// flushWork 如果有延时任务执行的话，那么会先暂停延时任务，然后调用 workLoop ，去真正执行超时的更新任务。
function flushWork(hasTimeRemaining, initialTime) {
  if (enableProfiling) {
    markSchedulerUnsuspended(initialTime);
  }

  // We'll need a host callback the next time work is scheduled.
  // 下次安排工作时，我们需要一个host回调。
  isHostCallbackScheduled = false;
  if (isHostTimeoutScheduled) { //如果有延时任务，那么先暂定延时任务
    // We scheduled a timeout but it's no longer needed. Cancel it.
    // 重置了 isHostTimeoutScheduled 的状态，确保在 flush 执行时，可以让新的任务被 schedule
    isHostTimeoutScheduled = false;
    cancelHostTimeout();
  }

  isPerformingWork = true;
  const previousPriorityLevel = currentPriorityLevel;
  // flushWork 中将调用 workLoop，workLoop 会逐一执行 taskQueue 中的任务，
  // 直到调度过程被暂停（时间片用尽）或任务全部被清空。
  try {
    if (enableProfiling) {
      try {
        return workLoop(hasTimeRemaining, initialTime);
      } catch (error) {
        if (currentTask !== null) {
          const currentTime = getCurrentTime();
          markTaskErrored(currentTask, currentTime);
          currentTask.isQueued = false;
        }
        throw error;
      }
    } else {
      // No catch in prod code path.
      // 执行 workLoop 里面会真正调度我们的事件
      return workLoop(hasTimeRemaining, initialTime);
    }
  } finally {
    currentTask = null;
    currentPriorityLevel = previousPriorityLevel;
    isPerformingWork = false;
    if (enableProfiling) {
      const currentTime = getCurrentTime();
      markSchedulerSuspended(currentTime);
    }
  }
}

// 这个 workLoop 是调度中的 workLoop，不要把它和调和中的 workLoop 弄混淆了。
// workLoop 会依次更新过期任务队列中的任务。到此为止，完成整个调度过程。
function workLoop(hasTimeRemaining, initialTime) {
  // 保存当前时间, 用于判断任务是否过期
  let currentTime = initialTime;
  advanceTimers(currentTime);
  // 获取任务列表中的第一个（优先级最高的任务）
  currentTask = peek(taskQueue);
  while (
    currentTask !== null &&
    !(enableSchedulerDebugging && isSchedulerPaused)
  ) {
    if (
      currentTask.expirationTime > currentTime &&
      (!hasTimeRemaining || shouldYieldToHost())
    ) {
      //检查当前任务未过期的情况下 是否 当前有剩余时间 或者 需要让出给高优先级的任务
      break;
    }
    // 真正的更新函数 callback
    const callback = currentTask.callback;
    if (typeof callback === 'function') {
      currentTask.callback = null;
      currentPriorityLevel = currentTask.priorityLevel;
      // 是否过期
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;
      if (enableProfiling) {
        markTaskRun(currentTask, currentTime);
      }
      // 执行 currentTask.callback，并将当前任务是否过期作为参数。
      // 这个 callback 会根据当前是否过期状态，缓存当前执行结果，返回未来可能会继续执行的方法：
      // 执行回调
      const continuationCallback = callback(didUserCallbackTimeout);
      // 如果callback 返回为 非函数，代表任务可能已经完成，将从 taskQueue 中 pop 掉该任务
      currentTime = getCurrentTime();
      if (typeof continuationCallback === 'function') {
        // 产生了连续回调(如fiber树太大, 出现了中断渲染), 保留currentTask, 以便下次继续执行
        currentTask.callback = continuationCallback;
        if (enableProfiling) {
          markTaskYield(currentTask, currentTime);
        }
      } else {
        if (enableProfiling) {
          markTaskCompleted(currentTask, currentTime);
          currentTask.isQueued = false;
        }
        // 如果当前任务等于第一个任务，把currentTask移出队列
        if (currentTask === peek(taskQueue)) {
          pop(taskQueue);
        }
      }
      // 查看一下 timeQueue 中有没有 过期任务
      advanceTimers(currentTime);
    } else {
      // 如果任务被取消(这时currentTask.callback = null), 将其移出队列
      pop(taskQueue);
    }
    // 再一次获取任务，循环执行，更新currentTask
    currentTask = peek(taskQueue);
  }
  // Return whether there's additional work
  if (currentTask !== null) {
    // 如果task队列没有清空, 返回true. 等待调度中心下一次回调
    return true;
  } else {
    const firstTimer = peek(timerQueue);
    if (firstTimer !== null) {
      requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
    }
    // task队列已经清空, 返回false.
    return false;
  }
}

// 接受一个优先级和一个回调函数
// 将schedule的优先级和react的优先级lane模型相结合
function unstable_runWithPriority(priorityLevel, eventHandler) {
  switch (priorityLevel) {
    case ImmediatePriority:
    case UserBlockingPriority:
    case NormalPriority:
    case LowPriority:
    case IdlePriority:
      break;
    default:
      priorityLevel = NormalPriority;
  }

  var previousPriorityLevel = currentPriorityLevel;
  currentPriorityLevel = priorityLevel;

  try {
    return eventHandler();
  } finally {
    currentPriorityLevel = previousPriorityLevel;
  }
}

function unstable_next(eventHandler) {
  var priorityLevel;
  switch (currentPriorityLevel) {
    case ImmediatePriority:
    case UserBlockingPriority:
    case NormalPriority:
      // Shift down to normal priority
      priorityLevel = NormalPriority;
      break;
    default:
      // Anything lower than normal priority should remain at the current level.
      priorityLevel = currentPriorityLevel;
      break;
  }

  var previousPriorityLevel = currentPriorityLevel;
  currentPriorityLevel = priorityLevel;

  try {
    return eventHandler();
  } finally {
    currentPriorityLevel = previousPriorityLevel;
  }
}

function unstable_wrapCallback(callback) {
  var parentPriorityLevel = currentPriorityLevel;
  return function() {
    // This is a fork of runWithPriority, inlined for performance.
    var previousPriorityLevel = currentPriorityLevel;
    currentPriorityLevel = parentPriorityLevel;

    try {
      return callback.apply(this, arguments);
    } finally {
      currentPriorityLevel = previousPriorityLevel;
    }
  };
}

// unstable_scheduleCallback 是 Scheduler 导出的一个核心方法，它将结合任务的优先级信息为其执行不同的调度逻辑。
// unstable_scheduleCallback 的主要工作是针对当前任务创建一个 task，
// 然后结合 startTime 信息将这个 task 推入 timerQueue 或 taskQueue，
// 最后根据 timerQueue 和 taskQueue 的情况，执行延时任务或即时任务
function unstable_scheduleCallback(priorityLevel, callback, options) {
  // 获取当前时间
  var currentTime = getCurrentTime();

  // 开始时间
  // 声明 startTime，startTime 是任务的预期开始时间
  var startTime;
  // 以下是对 options 入参的处理
  if (typeof options === 'object' && options !== null) {
    var delay = options.delay;
    // 若入参规定了延迟时间，则累加延迟时间
    if (typeof delay === 'number' && delay > 0) {
      startTime = currentTime + delay;
    } else {
      startTime = currentTime;
    }
  } else {
    startTime = currentTime;
  }

  //  timeout 是根据当前任务的 priorityLevel 来定义的，Scheduler 目前有 5 种优先级的 Timeout 描述
  // timeout 是 expirationTime 的计算依据
  var timeout;
  // 根据 priorityLevel，确定 timeout 的值
  switch (priorityLevel) {
    case ImmediatePriority:
      timeout = IMMEDIATE_PRIORITY_TIMEOUT;
      break;
    case UserBlockingPriority:
      timeout = USER_BLOCKING_PRIORITY_TIMEOUT;
      break;
    case IdlePriority:
      timeout = IDLE_PRIORITY_TIMEOUT;
      break;
    case LowPriority:
      timeout = LOW_PRIORITY_TIMEOUT;
      break;
    case NormalPriority:
    default:
      timeout = NORMAL_PRIORITY_TIMEOUT;
      break;
  }

  // expirationTime描述任务的过期时间
  // 计算过期时间：超时时间  = 开始时间（现在时间） + 任务超时的时间（上述设置那五个等级）
   // 优先级越高，timout 越小，expirationTime 越小
  var expirationTime = startTime + timeout;

  // 创建 task 对象
  // 创建一个新任务
  var newTask = {
    id: taskIdCounter++,
    callback,
    priorityLevel,
    startTime,
    expirationTime,
    sortIndex: -1,
  };
  if (enableProfiling) {
    newTask.isQueued = false;
  }

  // 当 startTime > currentTime，意味着当前任务是被设置为 delay，task.sortIndex 被 startTime 赋值，并向 timerQueue push task
  // Else 的情况，也就是 当前任务没有设置 delay，task.sortIndex 被 expirationTime 赋值，并向 taskQueue push task
  // 若当前时间小于开始时间，说明该任务可延时执行(未过期）
  if (startTime > currentTime) {
    // This is a delayed task.  这是一个延迟任务。
    // 通过开始时间排序
    // 将未过期任务推入 "timerQueue"
    newTask.sortIndex = startTime;
    // 把任务放在timerQueue中
    // timerQueue存储的都是没有过期任务
    push(timerQueue, newTask);
    // 若 taskQueue 中没有可执行的任务，而当前任务又是 timerQueue 中的第一个任务
    if (peek(taskQueue) === null && newTask === peek(timerQueue)) {
      // 
      // 所有任务都被延迟了，这是延迟最早的任务。
      if (isHostTimeoutScheduled) {
        // Cancel an existing timeout.
        // cancelHostTimeout 用于清除当前的延时器。
        cancelHostTimeout();
      } else {
        isHostTimeoutScheduled = true;
      }
      // Schedule a timeout.
      // 执行setTimeout
      // 那么就派发一个延时任务，这个延时任务用于检查当前任务是否过期
      // 这个延时调用（也就是 handleTimeout）并不会直接调度执行当前任务——它的作用是在当前任务到期后，
      // 将其从 timerQueue 中取出，加入 taskQueue 中，然后触发对 flushWork 的调用
      requestHostTimeout(handleTimeout, startTime - currentTime);
    }
  } else {
    // 通过 expirationTime 排序
    // else 里处理的是当前时间大于 startTime 的情况，说明这个任务已过期
    newTask.sortIndex = expirationTime;
    // 把任务放入taskQueue 
    // taskQueue 存储的都是过期任务，需立即执行的任务
    push(taskQueue, newTask);
    if (enableProfiling) {
      markTaskStart(newTask, currentTime);
      newTask.isQueued = true;
    }
    // Schedule a host callback, if needed. If we're already performing work,
    // wait until the next time we yield.
    // 如果需要，安排host回调。 如果我们已经在执行工作，请等到下一次让步。
    // 没有处于调度中的任务， 然后向浏览器请求一帧，浏览器空闲执行 flushWork
    if (!isHostCallbackScheduled && !isPerformingWork) {
      isHostCallbackScheduled = true;
      // 调度过期的任务
      // 执行 taskQueue 中的任务
      requestHostCallback(flushWork);
    }
  }

  return newTask;
}

function unstable_pauseExecution() {
  isSchedulerPaused = true;
}

function unstable_continueExecution() {
  isSchedulerPaused = false;
  if (!isHostCallbackScheduled && !isPerformingWork) {
    isHostCallbackScheduled = true;
    requestHostCallback(flushWork);
  }
}

function unstable_getFirstCallbackNode() {
  return peek(taskQueue);
}

function unstable_cancelCallback(task) {
  if (enableProfiling) {
    if (task.isQueued) {
      const currentTime = getCurrentTime();
      markTaskCanceled(task, currentTime);
      task.isQueued = false;
    }
  }

  // Null out the callback to indicate the task has been canceled. (Can't
  // remove from the queue because you can't remove arbitrary nodes from an
  // array based heap, only the first one.)
  task.callback = null;
}

function unstable_getCurrentPriorityLevel() {
  return currentPriorityLevel;
}

let isMessageLoopRunning = false;
let scheduledHostCallback = null;
let taskTimeoutID = -1;

// Scheduler periodically yields in case there is other work on the main
// thread, like user events. By default, it yields multiple times per frame.
// It does not attempt to align with frame boundaries, since most tasks don't
// need to be frame aligned; for those that do, use requestAnimationFrame.
// 调度程序会定期中断，以防主线程上有其他工作，例如用户事件。 
// 默认情况下，它每帧产生多次。 它不会尝试与帧边界对齐，因为大多数任务不需要帧对齐； 
// 对于那些这样做的人，请使用 requestAnimationFrame。
let frameInterval = frameYieldMs;
const continuousInputInterval = continuousYieldMs;
const maxInterval = maxYieldMs;
let startTime = -1;

let needsPaint = false;

// 判断是否需要中断程序，将主线程还给浏览器，使浏览器有时间渲染
function shouldYieldToHost() {
  const timeElapsed = getCurrentTime() - startTime;
  // 每更新一个节点，判断时间流逝是否超过5ms，如果没有超过则继续向下更新，
  // 如果超过5ms则中断更新，等待下一帧继续更新
  if (timeElapsed < frameInterval) {
    // The main thread has only been blocked for a really short amount of time;
    // smaller than a single frame. Don't yield yet.
    // 主线程只被阻塞了很短的时间
    // 小于单帧的时间
    return false;
  }

  // The main thread has been blocked for a non-negligible amount of time. We
  // may want to yield control of the main thread, so the browser can perform
  // high priority tasks. The main ones are painting and user input. If there's
  // a pending paint or a pending input, then we should yield. But if there's
  // neither, then we can yield less often while remaining responsive. We'll
  // eventually yield regardless, since there could be a pending paint that
  // wasn't accompanied by a call to `requestPaint`, or other main thread tasks
  // like network events.
  // 主线程已经被阻塞了相当长的时间。
  // 我们可能想让出主线程的控制权，这样浏览器就可以执行高优先级的任务。
  // 主要的任务是绘画和用户输入。如果有一个悬而未决的绘画或一个悬而未决的输入，那么我们应该让步。
  // 但如果两者都没有，那么我们就可以在保持响应的同时减少屈服的次数。
  // 无论怎样，我们最终都会让步，因为可能会有一个没有调用 "requestPaint "的挂起的绘画，或其他主线程任务，如网络事件。
  if (enableIsInputPending) {
    if (needsPaint) {
      // There's a pending paint (signaled by `requestPaint`). Yield now.
      return true;
    }
    // 如果剩余时间小于50ms
    if (timeElapsed < continuousInputInterval) {
      // We haven't blocked the thread for that long. Only yield if there's a
      // pending discrete input (e.g. click). It's OK if there's pending
      // continuous input (e.g. mouseover).
      // 我们已经很久没有阻塞线程了。 仅当有待处理的离散输入（例如单击）时才产生。 如果有未决的连续输入（例如鼠标悬停），则可以。
      if (isInputPending !== null) {
        return isInputPending();
      }
      // 如果剩余时间小于300ms
    } else if (timeElapsed < maxInterval) {
      // Yield if there's either a pending discrete or continuous input.
      // 如果有待处理的连续输入，例如一直在input输入则走该分支
      if (isInputPending !== null) {
        return isInputPending(continuousOptions);
      }
    } else {
      // We've blocked the thread for a long time. Even if there's no pending
      // input, there may be some other scheduled work that we don't know about,
      // like a network event. Yield now.
      // 我们已经阻塞线程很长时间了。 即使没有待处理的输入，也可能有一些我们不知道的其他预定工作，例如网络事件。 现在中断。
      return true;
    }
  }

  // `isInputPending` isn't available. Yield now.
  // `isInputPending` 不可用的情况下，中断
  return true;
}

function requestPaint() {
  if (
    enableIsInputPending &&
    navigator !== undefined &&
    navigator.scheduling !== undefined &&
    navigator.scheduling.isInputPending !== undefined
  ) {
    needsPaint = true;
  }

  // Since we yield every frame regardless, `requestPaint` has no effect.
}
// 根据浏览器动态分配时间
function forceFrameRate(fps) {
  if (fps < 0 || fps > 125) {
    // Using console['error'] to evade Babel and ESLint
    console['error'](
      'forceFrameRate takes a positive int between 0 and 125, ' +
        'forcing frame rates higher than 125 fps is not supported',
    );
    return;
  }
  if (fps > 0) {
    frameInterval = Math.floor(1000 / fps);
  } else {
    // reset the framerate
    frameInterval = frameYieldMs;
  }
}

const performWorkUntilDeadline = () => {
  // scheduledHostCallback 来自于 requestHostCallback 中的 callback
  if (scheduledHostCallback !== null) {
    const currentTime = getCurrentTime();
    // Keep track of the start time so we can measure how long the main thread
    // has been blocked.
    startTime = currentTime;
    const hasTimeRemaining = true;

    // If a scheduler task throws, exit the current browser task so the
    // error can be observed.
    // 如果调度程序任务抛出，请退出当前浏览器任务，以便观察错误。
    //
    // Intentionally not using a try-catch, since that makes some debugging
    // techniques harder. Instead, if `scheduledHostCallback` errors, then
    // `hasMoreWork` will remain true, and we'll continue the work loop.
    // 故意不使用 try-catch，因为这会使某些调试技术更加困难。
    // 相反，如果 `scheduledHostCallback` 错误，那么 `hasMoreWork` 将保持为真，我们将继续工作循环。
    let hasMoreWork = true;
    try {
      // 调用 scheduledHostCallback ，并返回当前是否有更多的任务需要执行。如果有将会递归调用 performWorkUntilDeadline
      hasMoreWork = scheduledHostCallback(hasTimeRemaining, currentTime);
    } finally {
      if (hasMoreWork) {
        // If there's more work, schedule the next message event at the end
        // of the preceding one.
        // 如果还有更多工作，请在前一个消息事件的末尾安排下一个消息事件。
        schedulePerformWorkUntilDeadline();
      } else {
        isMessageLoopRunning = false;
        scheduledHostCallback = null;
      }
    }
  } else {
    isMessageLoopRunning = false;
  }
  // Yielding to the browser will give it a chance to paint, so we can
  // reset this.
  // 让步于浏览器将给它一个绘制的机会，所以我们可以重置它。
  needsPaint = false;
};

let schedulePerformWorkUntilDeadline;
if (typeof localSetImmediate === 'function') {
  // Node.js and old IE.
  // There's a few reasons for why we prefer setImmediate.
  //
  // Unlike MessageChannel, it doesn't prevent a Node.js process from exiting.
  // (Even though this is a DOM fork of the Scheduler, you could get here
  // with a mix of Node.js 15+, which has a MessageChannel, and jsdom.)
  // https://github.com/facebook/react/issues/20756
  //
  // But also, it runs earlier which is the semantic we want.
  // If other browsers ever implement it, it's better to use it.
  // Although both of these would be inferior to native scheduling.
  schedulePerformWorkUntilDeadline = () => {
    localSetImmediate(performWorkUntilDeadline);
  };
} else if (typeof MessageChannel !== 'undefined') {
  // DOM and Worker environments.
  // We prefer MessageChannel because of the 4ms setTimeout clamping.
  // DOM 和 Worker 环境。
  // 由于 4ms setTimeout 限制，我们更喜欢 MessageChannel。
  // 实例化 MessageChannel，并创建两个 Port
  // 设置 port1 的 handle 为 performWorkUntilDeadline
  // requestHostCallback 将发送消息，触发 performWorkUntilDeadline
  const channel = new MessageChannel();
  const port = channel.port2;
  channel.port1.onmessage = performWorkUntilDeadline;
  schedulePerformWorkUntilDeadline = () => {
    port.postMessage(null);
  };
} else {
  // We should only fallback here in non-browser environments.
  schedulePerformWorkUntilDeadline = () => {
    localSetTimeout(performWorkUntilDeadline, 0);
  };
}

function requestHostCallback(callback) {
  scheduledHostCallback = callback;
  if (!isMessageLoopRunning) {
    isMessageLoopRunning = true;
    schedulePerformWorkUntilDeadline();
  }
}


// equestHostTimeout 让一个未过期的任务能够到达恰好过期的状态，
// 那么需要延迟 startTime - currentTime 毫秒就可以了。requestHostTimeout 就是通过 setTimeout 来进行延时指定时间的。
function requestHostTimeout(callback, ms) {
  taskTimeoutID = localSetTimeout(() => {
    callback(getCurrentTime());
  }, ms);
}

function cancelHostTimeout() {
  localClearTimeout(taskTimeoutID);
  taskTimeoutID = -1;
}

const unstable_requestPaint = requestPaint;

export {
  ImmediatePriority as unstable_ImmediatePriority,
  UserBlockingPriority as unstable_UserBlockingPriority,
  NormalPriority as unstable_NormalPriority,
  IdlePriority as unstable_IdlePriority,
  LowPriority as unstable_LowPriority,
  unstable_runWithPriority,
  unstable_next,
  unstable_scheduleCallback,
  unstable_cancelCallback,
  unstable_wrapCallback,
  unstable_getCurrentPriorityLevel,
  shouldYieldToHost as unstable_shouldYield,
  unstable_requestPaint,
  unstable_continueExecution,
  unstable_pauseExecution,
  unstable_getFirstCallbackNode,
  getCurrentTime as unstable_now,
  forceFrameRate as unstable_forceFrameRate,
};

export const unstable_Profiling = enableProfiling
  ? {
      startLoggingProfilingEvents,
      stopLoggingProfilingEvents,
    }
  : null;
