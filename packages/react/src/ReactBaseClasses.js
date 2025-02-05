/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import ReactNoopUpdateQueue from './ReactNoopUpdateQueue';
import assign from 'shared/assign';

const emptyObject = {};
if (__DEV__) {
  Object.freeze(emptyObject);
}

/**
 * Base class helpers for the updating state of a component.
 */
// 执行constructor
function Component(props, context, updater) {
  this.props = props; //绑定props
  this.context = context; //绑定context
  // If a component has string refs, we will assign a different object later.
  // 如果一个组件有字符串引用，我们稍后会分配一个不同的对象。
  this.refs = emptyObject; //绑定ref
  // We initialize the default updater but the real one gets injected by the
  // renderer.
  // 我们初始化了默认的更新器，但真正的更新器被渲染器注入。
  this.updater = updater || ReactNoopUpdateQueue; //绑定updater
}

Component.prototype.isReactComponent = {};

/**
 * Sets a subset of the state. Always use this to mutate
 * state. You should treat `this.state` as immutable.
 *
 * There is no guarantee that `this.state` will be immediately updated, so
 * accessing `this.state` after calling this method may return the old value.
 *
 * There is no guarantee that calls to `setState` will run synchronously,
 * as they may eventually be batched together.  You can provide an optional
 * callback that will be executed when the call to setState is actually
 * completed.
 *
 * When a function is provided to setState, it will be called at some point in
 * the future (not synchronously). It will be called with the up to date
 * component arguments (state, props, context). These values can be different
 * from this.* because your function may be called after receiveProps but before
 * shouldComponentUpdate, and this new state, props, and context will not yet be
 * assigned to this.
 *
 * @param {object|function} partialState Next partial state or function to
 *        produce next partial state to be merged with current state.
 *        当 obj 为一个对象，则为即将合并的 state ；如果 obj 是一个函数，
 *        那么当前组件的 state 和 props 将作为参数，返回值用于合并新的 state。
 * @param {?function} callback Called after state is updated.callback
 *                    callback 为一个函数，函数执行上下文中可以获取当前 setState 更新后的最新 state 的值，
 *                    可以作为依赖 state 变化的副作用函数，可以用来做一些基于 DOM 的操作。

 * @final
 * @protected
 */
Component.prototype.setState = function (partialState, callback) {
  if (
    typeof partialState !== 'object' &&
    typeof partialState !== 'function' &&
    partialState != null
  ) {
    throw new Error(
      'takes an object of state variables to update or a ' +
        'function which returns an object of state variables.',
    );
  }

  this.updater.enqueueSetState(this, partialState, callback, 'setState');
};

/**
 * Forces an update. This should only be invoked when it is known with
 * certainty that we are **not** in a DOM transaction.
 *
 * You may want to call this when you know that some deeper aspect of the
 * component's state has changed but `setState` was not called.
 *
 * This will not invoke `shouldComponentUpdate`, but it will invoke
 * `componentWillUpdate` and `componentDidUpdate`.
 *
 *  该方法为强制调用，应该在已知时调用，并且确定使用的时候不再DOM的事件中
 *  当组件状态(数据)更深层次方面已经更改，但是并没用调用setState，视图没有发生改变，可以调用forceUpdate强制更新
 *  这不会调用 `shouldComponentUpdate`，但会调用`componentWillUpdate` 和 `componentDidUpdate`
 * @param {?function} callback Called after update is complete.
 *                    callback在更新完成后调用
 * @final
 * @protected
 */
Component.prototype.forceUpdate = function (callback) {
  this.updater.enqueueForceUpdate(this, callback, 'forceUpdate');
};

/**
 * Deprecated APIs. These APIs used to exist on classic React classes but since
 * we would like to deprecate them, we're not going to move them over to this
 * modern base class. Instead, we define a getter that warns if it's accessed.
 * 弃用的 API。 这些 API 曾经存在于经典的 React 类中，但由于我们希望弃用它们，
 * 我们不会将它们移到这个现代基类中。 相反，我们定义了一个 getter 来警告它是否被访问。
 */
if (__DEV__) {
  const deprecatedAPIs = {
    isMounted: [
      'isMounted',
      'Instead, make sure to clean up subscriptions and pending requests in ' +
        'componentWillUnmount to prevent memory leaks.',
    ],
    replaceState: [
      'replaceState',
      'Refactor your code to use setState instead (see ' +
        'https://github.com/facebook/react/issues/3236).',
    ],
  };
  const defineDeprecationWarning = function (methodName, info) {
    Object.defineProperty(Component.prototype, methodName, {
      get: function () {
        console.warn(
          '%s(...) is deprecated in plain JavaScript React classes. %s',
          info[0],
          info[1],
        );
        return undefined;
      },
    });
  };
  for (const fnName in deprecatedAPIs) {
    if (deprecatedAPIs.hasOwnProperty(fnName)) {
      defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
    }
  }
}

function ComponentDummy() {}
ComponentDummy.prototype = Component.prototype;

/**
 * Convenience component with default shallow equality check for sCU.
 */
function PureComponent(props, context, updater) {
  this.props = props;
  this.context = context;
  // If a component has string refs, we will assign a different object later.
  this.refs = emptyObject;
  this.updater = updater || ReactNoopUpdateQueue;
}

const pureComponentPrototype = (PureComponent.prototype = new ComponentDummy());
pureComponentPrototype.constructor = PureComponent;
// Avoid an extra prototype jump for these methods.
assign(pureComponentPrototype, Component.prototype);
pureComponentPrototype.isPureReactComponent = true;

export {Component, PureComponent};
