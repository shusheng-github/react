/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactElement} from 'shared/ReactElementType';
import type {ReactFragment, ReactPortal, ReactScope} from 'shared/ReactTypes';
import type {Fiber} from './ReactInternalTypes';
import type {RootTag} from './ReactRootTags';
import type {WorkTag} from './ReactWorkTags';
import type {TypeOfMode} from './ReactTypeOfMode';
import type {Lanes} from './ReactFiberLane.old';
import type {SuspenseInstance, Props} from './ReactFiberHostConfig';
import type {OffscreenProps} from './ReactFiberOffscreenComponent';

import invariant from 'shared/invariant';
import {
  createRootStrictEffectsByDefault,
  enableCache,
  enableStrictEffects,
  enableProfilerTimer,
  enableScopeAPI,
  enableSyncDefaultUpdates,
  allowConcurrentByDefault,
} from 'shared/ReactFeatureFlags';
import {
  supportsPersistence,
  getOffscreenContainerType,
} from './ReactFiberHostConfig';
import {NoFlags, Placement, StaticMask} from './ReactFiberFlags';
import {ConcurrentRoot} from './ReactRootTags';
import {
  IndeterminateComponent,
  ClassComponent,
  HostRoot,
  HostComponent,
  HostText,
  HostPortal,
  ForwardRef,
  Fragment,
  Mode,
  ContextProvider,
  ContextConsumer,
  Profiler,
  SuspenseComponent,
  SuspenseListComponent,
  DehydratedFragment,
  FunctionComponent,
  MemoComponent,
  SimpleMemoComponent,
  LazyComponent,
  ScopeComponent,
  OffscreenComponent,
  LegacyHiddenComponent,
  CacheComponent,
} from './ReactWorkTags';
import getComponentNameFromFiber from 'react-reconciler/src/getComponentNameFromFiber';

import {isDevToolsPresent} from './ReactFiberDevToolsHook.old';
import {
  resolveClassForHotReloading,
  resolveFunctionForHotReloading,
  resolveForwardRefForHotReloading,
} from './ReactFiberHotReloading.old';
import {NoLanes} from './ReactFiberLane.old';
import {
  NoMode,
  ConcurrentMode,
  DebugTracingMode,
  ProfileMode,
  StrictLegacyMode,
  StrictEffectsMode,
  ConcurrentUpdatesByDefaultMode,
} from './ReactTypeOfMode';
import {
  REACT_FORWARD_REF_TYPE,
  REACT_FRAGMENT_TYPE,
  REACT_DEBUG_TRACING_MODE_TYPE,
  REACT_STRICT_MODE_TYPE,
  REACT_PROFILER_TYPE,
  REACT_PROVIDER_TYPE,
  REACT_CONTEXT_TYPE,
  REACT_SUSPENSE_TYPE,
  REACT_SUSPENSE_LIST_TYPE,
  REACT_MEMO_TYPE,
  REACT_LAZY_TYPE,
  REACT_SCOPE_TYPE,
  REACT_OFFSCREEN_TYPE,
  REACT_LEGACY_HIDDEN_TYPE,
  REACT_CACHE_TYPE,
} from 'shared/ReactSymbols';

export type {Fiber};

let hasBadMapPolyfill;

if (__DEV__) {
  hasBadMapPolyfill = false;
  try {
    const nonExtensibleObject = Object.preventExtensions({});
    /* eslint-disable no-new */
    new Map([[nonExtensibleObject, null]]);
    new Set([nonExtensibleObject]);
    /* eslint-enable no-new */
  } catch (e) {
    // TODO: Consider warning about bad polyfills
    hasBadMapPolyfill = true;
  }
}

function FiberNode(
  tag: WorkTag,
  pendingProps: mixed,
  key: null | string,
  mode: TypeOfMode,
) {
  // Instance实例
  // 作为静态数据结构的属性
  this.tag = tag; // fiber 标签 证明是什么类型fiber。
  this.key = key; // key调和子节点时候用到。 
  this.elementType = null;
  this.type = null; // dom元素是对应的元素类型，比如div，组件指向组件对应的类或者函数。  
  this.stateNode = null; // 指向对应的真实dom元素，类组件指向组件实例，可以被ref获取。

  // Fiber
  // 用于连接其他Fiber节点形成Fiber树
  this.return = null; // 指向父级fiber
  this.child = null; // 指向子级fiber
  this.sibling = null; // 指向兄弟fiber 
  this.index = 0; // 索引

  this.ref = null; // ref指向，ref函数，或者ref对象。

  // 存放内存中fiber内容
  // 动态工作单元的属性
  this.pendingProps = pendingProps; // 在一次更新中，代表element创建
  this.memoizedProps = null; //记录上一次更新完毕后的props
  this.updateQueue = null; // 类组件存放setState更新队列，函数组件存放
  this.memoizedState = null; // 类组件保存state信息，函数组件保存hooks信息，dom元素为null
  this.dependencies = null; // context或是时间的依赖项

  this.mode = mode; //描述fiber树的模式，比如 ConcurrentMode 模式

  // Effects
  this.flags = NoFlags;
  this.subtreeFlags = NoFlags;
  this.deletions = null;

  // 调度优先级相关
  this.lanes = NoLanes;
  this.childLanes = NoLanes;

  // 指向该feiber在另一次更新时对应的fiber
  this.alternate = null; //双缓存树，指向缓存的fiber。更新阶段，两颗树互相交替。

  if (enableProfilerTimer) {
    // Note: The following is done to avoid a v8 performance cliff.
    //
    // Initializing the fields below to smis and later updating them with
    // double values will cause Fibers to end up having separate shapes.
    // This behavior/bug has something to do with Object.preventExtension().
    // Fortunately this only impacts DEV builds.
    // Unfortunately it makes React unusably slow for some applications.
    // To work around this, initialize the fields below with doubles.
    //
    // Learn more about this here:
    // https://github.com/facebook/react/issues/14365
    // https://bugs.chromium.org/p/v8/issues/detail?id=8538
    this.actualDuration = Number.NaN;
    this.actualStartTime = Number.NaN;
    this.selfBaseDuration = Number.NaN;
    this.treeBaseDuration = Number.NaN;

    // It's okay to replace the initial doubles with smis after initialization.
    // This won't trigger the performance cliff mentioned above,
    // and it simplifies other profiler code (including DevTools).
    this.actualDuration = 0;
    this.actualStartTime = -1;
    this.selfBaseDuration = 0;
    this.treeBaseDuration = 0;
  }

  if (__DEV__) {
    // This isn't directly used but is handy for debugging internals:

    this._debugSource = null;
    this._debugOwner = null;
    this._debugNeedsRemount = false;
    this._debugHookTypes = null;
    if (!hasBadMapPolyfill && typeof Object.preventExtensions === 'function') {
      Object.preventExtensions(this);
    }
  }
}

// This is a constructor function, rather than a POJO constructor, still
// please ensure we do the following:
// 1) Nobody should add any instance methods on this. Instance methods can be
//    more difficult to predict when they get optimized and they are almost
//    never inlined properly in static compilers.
// 2) Nobody should rely on `instanceof Fiber` for type testing. We should
//    always know when it is a fiber.
// 3) We might want to experiment with using numeric keys since they are easier
//    to optimize in a non-JIT environment.
// 4) We can easily go from a constructor to a createFiber object literal if that
//    is faster.
// 5) It should be easy to port this to a C struct and keep a C implementation
//    compatible.
const createFiber = function(
  tag: WorkTag,
  pendingProps: mixed,
  key: null | string,
  mode: TypeOfMode,
): Fiber {
  // 这里的形状是精确的，但 Flow 不喜欢构造函数
  // $FlowFixMe: the shapes are exact here but Flow doesn't like constructors
  return new FiberNode(tag, pendingProps, key, mode);
};

function shouldConstruct(Component: Function) {
  const prototype = Component.prototype;
  return !!(prototype && prototype.isReactComponent);
}

export function isSimpleFunctionComponent(type: any) {
  return (
    typeof type === 'function' &&
    !shouldConstruct(type) &&
    type.defaultProps === undefined
  );
}

export function resolveLazyComponentTag(Component: Function): WorkTag {
  if (typeof Component === 'function') {
    return shouldConstruct(Component) ? ClassComponent : FunctionComponent;
  } else if (Component !== undefined && Component !== null) {
    const $$typeof = Component.$$typeof;
    if ($$typeof === REACT_FORWARD_REF_TYPE) {
      return ForwardRef;
    }
    if ($$typeof === REACT_MEMO_TYPE) {
      return MemoComponent;
    }
  }
  return IndeterminateComponent;
}

// This is used to create an alternate fiber to do work on.
// 这用于创建alternate fiber以进行工作。
// 这里入参中的 current 传入的是现有树结构中的 rootFiber 对象
export function createWorkInProgress(current: Fiber, pendingProps: any): Fiber {
  let workInProgress = current.alternate;
  // ReactDOM.render 触发的首屏渲染将进入这个逻辑
  if (workInProgress === null) {
    // We use a double buffering pooling technique because we know that we'll
    // only ever need at most two versions of a tree. We pool the "other" unused
    // node that we're free to reuse. This is lazily created to avoid allocating
    // extra objects for things that are never updated. It also allow us to
    // reclaim the extra memory if needed.
    // 我们使用双缓冲池技术，因为我们知道我们最多只需要树的两个版本。 
    // 我们汇集了我们可以自由重用的“其他”未使用节点。 
    // 这是惰性创建的，以避免为从未更新的事物分配额外的对象。 如果需要，它还允许我们回收额外的内存。
    // workInProgress 是 createFiber 方法的返回值
    workInProgress = createFiber(
      current.tag,
      pendingProps,
      current.key,
      current.mode,
    );
    workInProgress.elementType = current.elementType;
    workInProgress.type = current.type;
    workInProgress.stateNode = current.stateNode;

    if (__DEV__) {
      // DEV-only fields

      workInProgress._debugSource = current._debugSource;
      workInProgress._debugOwner = current._debugOwner;
      workInProgress._debugHookTypes = current._debugHookTypes;
    }

    // workInProgress 的 alternate 将指向 current
    workInProgress.alternate = current;
    // current 的 alternate 将反过来指向 workInProgress
    current.alternate = workInProgress;
  } else {
    workInProgress.pendingProps = pendingProps;
    // Needed because Blocks store data on type.
    // 需要，因为块将数据存储在类型上。
    workInProgress.type = current.type;

    // We already have an alternate.
    // Reset the effect tag.
    // 已经有了alternate， 重置effect的tag
    workInProgress.flags = NoFlags;

    // The effects are no longer valid.
    // effects不再有效。
    workInProgress.subtreeFlags = NoFlags;
    workInProgress.deletions = null;

    if (enableProfilerTimer) {
      // We intentionally reset, rather than copy, actualDuration & actualStartTime.
      // This prevents time from endlessly accumulating in new commits.
      // This has the downside of resetting values for different priority renders,
      // But works for yielding (the common case) and should support resuming.
      workInProgress.actualDuration = 0;
      workInProgress.actualStartTime = -1;
    }
  }

  // Reset all effects except static ones.
  // Static effects are not specific to a render.
  // 重置除静态effects之外的所有效果。
  // 静态effects不是特定于渲染的。
  workInProgress.flags = current.flags & StaticMask;
  workInProgress.childLanes = current.childLanes;
  workInProgress.lanes = current.lanes;

  workInProgress.child = current.child;
  workInProgress.memoizedProps = current.memoizedProps;
  workInProgress.memoizedState = current.memoizedState;
  workInProgress.updateQueue = current.updateQueue;

  // Clone the dependencies object. This is mutated during the render phase, so
  // it cannot be shared with the current fiber.
  // 克隆依赖对象。 这在渲染阶段发生了变化，因此无法与当前fiber共享。
  const currentDependencies = current.dependencies;
  workInProgress.dependencies =
    currentDependencies === null
      ? null
      : {
          lanes: currentDependencies.lanes,
          firstContext: currentDependencies.firstContext,
        };

  // These will be overridden during the parent's reconciliation
  // 这些将在父级对帐期间被覆盖
  workInProgress.sibling = current.sibling;
  workInProgress.index = current.index;
  workInProgress.ref = current.ref;

  if (enableProfilerTimer) {
    workInProgress.selfBaseDuration = current.selfBaseDuration;
    workInProgress.treeBaseDuration = current.treeBaseDuration;
  }

  if (__DEV__) {
    workInProgress._debugNeedsRemount = current._debugNeedsRemount;
    switch (workInProgress.tag) {
      case IndeterminateComponent:
      case FunctionComponent:
      case SimpleMemoComponent:
        workInProgress.type = resolveFunctionForHotReloading(current.type);
        break;
      case ClassComponent:
        workInProgress.type = resolveClassForHotReloading(current.type);
        break;
      case ForwardRef:
        workInProgress.type = resolveForwardRefForHotReloading(current.type);
        break;
      default:
        break;
    }
  }

  // 返回 workInProgress 节点
  return workInProgress;
}

// Used to reuse a Fiber for a second pass.
export function resetWorkInProgress(workInProgress: Fiber, renderLanes: Lanes) {
  // This resets the Fiber to what createFiber or createWorkInProgress would
  // have set the values to before during the first pass. Ideally this wouldn't
  // be necessary but unfortunately many code paths reads from the workInProgress
  // when they should be reading from current and writing to workInProgress.

  // We assume pendingProps, index, key, ref, return are still untouched to
  // avoid doing another reconciliation.

  // Reset the effect flags but keep any Placement tags, since that's something
  // that child fiber is setting, not the reconciliation.
  workInProgress.flags &= StaticMask | Placement;

  // The effects are no longer valid.

  const current = workInProgress.alternate;
  if (current === null) {
    // Reset to createFiber's initial values.
    workInProgress.childLanes = NoLanes;
    workInProgress.lanes = renderLanes;

    workInProgress.child = null;
    workInProgress.subtreeFlags = NoFlags;
    workInProgress.memoizedProps = null;
    workInProgress.memoizedState = null;
    workInProgress.updateQueue = null;

    workInProgress.dependencies = null;

    workInProgress.stateNode = null;

    if (enableProfilerTimer) {
      // Note: We don't reset the actualTime counts. It's useful to accumulate
      // actual time across multiple render passes.
      workInProgress.selfBaseDuration = 0;
      workInProgress.treeBaseDuration = 0;
    }
  } else {
    // Reset to the cloned values that createWorkInProgress would've.
    workInProgress.childLanes = current.childLanes;
    workInProgress.lanes = current.lanes;

    workInProgress.child = current.child;
    workInProgress.subtreeFlags = NoFlags;
    workInProgress.deletions = null;
    workInProgress.memoizedProps = current.memoizedProps;
    workInProgress.memoizedState = current.memoizedState;
    workInProgress.updateQueue = current.updateQueue;
    // Needed because Blocks store data on type.
    workInProgress.type = current.type;

    // Clone the dependencies object. This is mutated during the render phase, so
    // it cannot be shared with the current fiber.
    const currentDependencies = current.dependencies;
    workInProgress.dependencies =
      currentDependencies === null
        ? null
        : {
            lanes: currentDependencies.lanes,
            firstContext: currentDependencies.firstContext,
          };

    if (enableProfilerTimer) {
      // Note: We don't reset the actualTime counts. It's useful to accumulate
      // actual time across multiple render passes.
      workInProgress.selfBaseDuration = current.selfBaseDuration;
      workInProgress.treeBaseDuration = current.treeBaseDuration;
    }
  }

  return workInProgress;
}

export function createHostRootFiber(
  tag: RootTag,
  isStrictMode: boolean,
  concurrentUpdatesByDefaultOverride: null | boolean,
): Fiber {
  let mode;
  if (tag === ConcurrentRoot) {
    mode = ConcurrentMode;
    if (isStrictMode === true) {
      mode |= StrictLegacyMode;

      if (enableStrictEffects) {
        mode |= StrictEffectsMode;
      }
    } else if (enableStrictEffects && createRootStrictEffectsByDefault) {
      mode |= StrictLegacyMode | StrictEffectsMode;
    }
    if (
      // We only use this flag for our repo tests to check both behaviors.
      // TODO: Flip this flag and rename it something like "forceConcurrentByDefaultForTesting"
      !enableSyncDefaultUpdates ||
      // Only for internal experiments.
      (allowConcurrentByDefault && concurrentUpdatesByDefaultOverride)
    ) {
      mode |= ConcurrentUpdatesByDefaultMode;
    }
  } else {
    mode = NoMode;
  }

  if (enableProfilerTimer && isDevToolsPresent) {
    // Always collect profile timings when DevTools are present.
    // This enables DevTools to start capturing timing at any point–
    // Without some nodes in the tree having empty base times.
    mode |= ProfileMode;
  }

  return createFiber(HostRoot, null, null, mode);
}

export function createFiberFromTypeAndProps(
  type: any, // React$ElementType
  key: null | string,
  pendingProps: any,
  owner: null | Fiber,
  mode: TypeOfMode,
  lanes: Lanes,
): Fiber {
  let fiberTag = IndeterminateComponent;
  // The resolved type is set if we know what the final type will be. I.e. it's not lazy.
  // 如果我们知道最终类型是什么，则设置解析类型。 IE。 这不是懒惰。
  let resolvedType = type;
  if (typeof type === 'function') {
    if (shouldConstruct(type)) {
      fiberTag = ClassComponent;
      if (__DEV__) {
        resolvedType = resolveClassForHotReloading(resolvedType);
      }
    } else {
      if (__DEV__) {
        resolvedType = resolveFunctionForHotReloading(resolvedType);
      }
    }
  } else if (typeof type === 'string') {
    fiberTag = HostComponent;
  } else {
    getTag: switch (type) {
      case REACT_FRAGMENT_TYPE:
        return createFiberFromFragment(pendingProps.children, mode, lanes, key);
      case REACT_DEBUG_TRACING_MODE_TYPE:
        fiberTag = Mode;
        mode |= DebugTracingMode;
        break;
      case REACT_STRICT_MODE_TYPE:
        fiberTag = Mode;
        mode |= StrictLegacyMode;
        if (enableStrictEffects && (mode & ConcurrentMode) !== NoMode) {
          // Strict effects should never run on legacy roots
          // 严格的effects不应该在遗留roots上运行
          mode |= StrictEffectsMode;
        }
        break;
      case REACT_PROFILER_TYPE:
        return createFiberFromProfiler(pendingProps, mode, lanes, key);
      case REACT_SUSPENSE_TYPE:
        return createFiberFromSuspense(pendingProps, mode, lanes, key);
      case REACT_SUSPENSE_LIST_TYPE:
        return createFiberFromSuspenseList(pendingProps, mode, lanes, key);
      case REACT_OFFSCREEN_TYPE:
        return createFiberFromOffscreen(pendingProps, mode, lanes, key);
      case REACT_LEGACY_HIDDEN_TYPE:
        return createFiberFromLegacyHidden(pendingProps, mode, lanes, key);
      case REACT_SCOPE_TYPE:
        if (enableScopeAPI) {
          return createFiberFromScope(type, pendingProps, mode, lanes, key);
        }
      // eslint-disable-next-line no-fallthrough
      case REACT_CACHE_TYPE:
        if (enableCache) {
          return createFiberFromCache(pendingProps, mode, lanes, key);
        }
      // eslint-disable-next-line no-fallthrough
      default: {
        if (typeof type === 'object' && type !== null) {
          switch (type.$$typeof) {
            case REACT_PROVIDER_TYPE:
              fiberTag = ContextProvider;
              break getTag;
            case REACT_CONTEXT_TYPE:
              // This is a consumer
              fiberTag = ContextConsumer;
              break getTag;
            case REACT_FORWARD_REF_TYPE:
              fiberTag = ForwardRef;
              if (__DEV__) {
                resolvedType = resolveForwardRefForHotReloading(resolvedType);
              }
              break getTag;
            case REACT_MEMO_TYPE:
              fiberTag = MemoComponent;
              break getTag;
            case REACT_LAZY_TYPE:
              fiberTag = LazyComponent;
              resolvedType = null;
              break getTag;
          }
        }
        let info = '';
        if (__DEV__) {
          if (
            type === undefined ||
            (typeof type === 'object' &&
              type !== null &&
              Object.keys(type).length === 0)
          ) {
            info +=
              ' You likely forgot to export your component from the file ' +
              "it's defined in, or you might have mixed up default and " +
              'named imports.';
          }
          const ownerName = owner ? getComponentNameFromFiber(owner) : null;
          if (ownerName) {
            info += '\n\nCheck the render method of `' + ownerName + '`.';
          }
        }
        invariant(
          false,
          'Element type is invalid: expected a string (for built-in ' +
            'components) or a class/function (for composite components) ' +
            'but got: %s.%s',
          type == null ? type : typeof type,
          info,
        );
      }
    }
  }

  const fiber = createFiber(fiberTag, pendingProps, key, mode);
  fiber.elementType = type;
  fiber.type = resolvedType;
  fiber.lanes = lanes;

  if (__DEV__) {
    fiber._debugOwner = owner;
  }

  return fiber;
}

export function createOffscreenHostContainerFiber(
  props: Props,
  fiberMode: TypeOfMode,
  lanes: Lanes,
  key: null | string,
): Fiber {
  if (supportsPersistence) {
    const type = getOffscreenContainerType();
    const fiber = createFiber(HostComponent, props, key, fiberMode);
    fiber.elementType = type;
    fiber.type = type;
    fiber.lanes = lanes;
    return fiber;
  } else {
    // Only implemented in persistent mode
    invariant(false, 'Not implemented.');
  }
}

export function createFiberFromElement(
  element: ReactElement,
  mode: TypeOfMode,
  lanes: Lanes,
): Fiber {
  let owner = null;
  if (__DEV__) {
    owner = element._owner;
  }
  const type = element.type;
  const key = element.key;
  const pendingProps = element.props;
  // 创建fiber处理type和props
  const fiber = createFiberFromTypeAndProps(
    type,
    key,
    pendingProps,
    owner,
    mode,
    lanes,
  );
  if (__DEV__) {
    fiber._debugSource = element._source;
    fiber._debugOwner = element._owner;
  }
  return fiber;
}

export function createFiberFromFragment(
  elements: ReactFragment,
  mode: TypeOfMode,
  lanes: Lanes,
  key: null | string,
): Fiber {
  const fiber = createFiber(Fragment, elements, key, mode);
  fiber.lanes = lanes;
  return fiber;
}

function createFiberFromScope(
  scope: ReactScope,
  pendingProps: any,
  mode: TypeOfMode,
  lanes: Lanes,
  key: null | string,
) {
  const fiber = createFiber(ScopeComponent, pendingProps, key, mode);
  fiber.type = scope;
  fiber.elementType = scope;
  fiber.lanes = lanes;
  return fiber;
}

function createFiberFromProfiler(
  pendingProps: any,
  mode: TypeOfMode,
  lanes: Lanes,
  key: null | string,
): Fiber {
  if (__DEV__) {
    if (typeof pendingProps.id !== 'string') {
      console.error(
        'Profiler must specify an "id" of type `string` as a prop. Received the type `%s` instead.',
        typeof pendingProps.id,
      );
    }
  }

  const fiber = createFiber(Profiler, pendingProps, key, mode | ProfileMode);
  fiber.elementType = REACT_PROFILER_TYPE;
  fiber.lanes = lanes;

  if (enableProfilerTimer) {
    fiber.stateNode = {
      effectDuration: 0,
      passiveEffectDuration: 0,
    };
  }

  return fiber;
}

export function createFiberFromSuspense(
  pendingProps: any,
  mode: TypeOfMode,
  lanes: Lanes,
  key: null | string,
) {
  const fiber = createFiber(SuspenseComponent, pendingProps, key, mode);
  fiber.elementType = REACT_SUSPENSE_TYPE;
  fiber.lanes = lanes;
  return fiber;
}

export function createFiberFromSuspenseList(
  pendingProps: any,
  mode: TypeOfMode,
  lanes: Lanes,
  key: null | string,
) {
  const fiber = createFiber(SuspenseListComponent, pendingProps, key, mode);
  fiber.elementType = REACT_SUSPENSE_LIST_TYPE;
  fiber.lanes = lanes;
  return fiber;
}

export function createFiberFromOffscreen(
  pendingProps: OffscreenProps,
  mode: TypeOfMode,
  lanes: Lanes,
  key: null | string,
) {
  const fiber = createFiber(OffscreenComponent, pendingProps, key, mode);
  fiber.elementType = REACT_OFFSCREEN_TYPE;
  fiber.lanes = lanes;
  return fiber;
}

export function createFiberFromLegacyHidden(
  pendingProps: OffscreenProps,
  mode: TypeOfMode,
  lanes: Lanes,
  key: null | string,
) {
  const fiber = createFiber(LegacyHiddenComponent, pendingProps, key, mode);
  fiber.elementType = REACT_LEGACY_HIDDEN_TYPE;
  fiber.lanes = lanes;
  return fiber;
}

export function createFiberFromCache(
  pendingProps: any,
  mode: TypeOfMode,
  lanes: Lanes,
  key: null | string,
) {
  const fiber = createFiber(CacheComponent, pendingProps, key, mode);
  fiber.elementType = REACT_CACHE_TYPE;
  fiber.lanes = lanes;
  return fiber;
}

export function createFiberFromText(
  content: string,
  mode: TypeOfMode,
  lanes: Lanes,
): Fiber {
  const fiber = createFiber(HostText, content, null, mode);
  fiber.lanes = lanes;
  return fiber;
}

export function createFiberFromHostInstanceForDeletion(): Fiber {
  const fiber = createFiber(HostComponent, null, null, NoMode);
  fiber.elementType = 'DELETED';
  return fiber;
}

export function createFiberFromDehydratedFragment(
  dehydratedNode: SuspenseInstance,
): Fiber {
  const fiber = createFiber(DehydratedFragment, null, null, NoMode);
  fiber.stateNode = dehydratedNode;
  return fiber;
}

export function createFiberFromPortal(
  portal: ReactPortal,
  mode: TypeOfMode,
  lanes: Lanes,
): Fiber {
  const pendingProps = portal.children !== null ? portal.children : [];
  const fiber = createFiber(HostPortal, pendingProps, portal.key, mode);
  fiber.lanes = lanes;
  fiber.stateNode = {
    containerInfo: portal.containerInfo,
    pendingChildren: null, // Used by persistent updates
    implementation: portal.implementation,
  };
  return fiber;
}

// Used for stashing WIP properties to replay failed work in DEV.
export function assignFiberPropertiesInDEV(
  target: Fiber | null,
  source: Fiber,
): Fiber {
  if (target === null) {
    // This Fiber's initial properties will always be overwritten.
    // We only use a Fiber to ensure the same hidden class so DEV isn't slow.
    target = createFiber(IndeterminateComponent, null, null, NoMode);
  }

  // This is intentionally written as a list of all properties.
  // We tried to use Object.assign() instead but this is called in
  // the hottest path, and Object.assign() was too slow:
  // https://github.com/facebook/react/issues/12502
  // This code is DEV-only so size is not a concern.

  target.tag = source.tag;
  target.key = source.key;
  target.elementType = source.elementType;
  target.type = source.type;
  target.stateNode = source.stateNode;
  target.return = source.return;
  target.child = source.child;
  target.sibling = source.sibling;
  target.index = source.index;
  target.ref = source.ref;
  target.pendingProps = source.pendingProps;
  target.memoizedProps = source.memoizedProps;
  target.updateQueue = source.updateQueue;
  target.memoizedState = source.memoizedState;
  target.dependencies = source.dependencies;
  target.mode = source.mode;
  target.flags = source.flags;
  target.subtreeFlags = source.subtreeFlags;
  target.deletions = source.deletions;
  target.lanes = source.lanes;
  target.childLanes = source.childLanes;
  target.alternate = source.alternate;
  if (enableProfilerTimer) {
    target.actualDuration = source.actualDuration;
    target.actualStartTime = source.actualStartTime;
    target.selfBaseDuration = source.selfBaseDuration;
    target.treeBaseDuration = source.treeBaseDuration;
  }

  target._debugSource = source._debugSource;
  target._debugOwner = source._debugOwner;
  target._debugNeedsRemount = source._debugNeedsRemount;
  target._debugHookTypes = source._debugHookTypes;
  return target;
}
