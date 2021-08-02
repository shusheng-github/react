/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// ATTENTION
// When adding new symbols to this file,
// Please consider also adding to 'react-devtools-shared/src/backend/ReactSymbols'

// The Symbol used to tag the ReactElement-like types. If there is no native Symbol
// nor polyfill, then a plain number is used for performance.
// react-element-type
export let REACT_ELEMENT_TYPE = 0xeac7;  //60103
// react-portal-type
export let REACT_PORTAL_TYPE = 0xeaca;   //60106
// react-fragment-type
export let REACT_FRAGMENT_TYPE = 0xeacb;  //60107
export let REACT_STRICT_MODE_TYPE = 0xeacc;   //60108
export let REACT_PROFILER_TYPE = 0xead2;  //60114
export let REACT_PROVIDER_TYPE = 0xeacd;  //60109
export let REACT_CONTEXT_TYPE = 0xeace;   //60110
export let REACT_FORWARD_REF_TYPE = 0xead0;  //60112
export let REACT_SUSPENSE_TYPE = 0xead1;   //60113
export let REACT_SUSPENSE_LIST_TYPE = 0xead8;  //60120
export let REACT_MEMO_TYPE = 0xead3;   //60115
export let REACT_LAZY_TYPE = 0xead4;   //60116
export let REACT_BLOCK_TYPE = 0xead9;    //60121
export let REACT_SERVER_BLOCK_TYPE = 0xeada;   //60122
export let REACT_FUNDAMENTAL_TYPE = 0xead5;    //60117
export let REACT_SCOPE_TYPE = 0xead7;   //60119
export let REACT_OPAQUE_ID_TYPE = 0xeae0;  //60128
export let REACT_DEBUG_TRACING_MODE_TYPE = 0xeae1;  //60129
export let REACT_OFFSCREEN_TYPE = 0xeae2;   //60130
export let REACT_LEGACY_HIDDEN_TYPE = 0xeae3;  //60131

if (typeof Symbol === 'function' && Symbol.for) {
  const symbolFor = Symbol.for;
  REACT_ELEMENT_TYPE = symbolFor('react.element');
  REACT_PORTAL_TYPE = symbolFor('react.portal');
  REACT_FRAGMENT_TYPE = symbolFor('react.fragment');
  REACT_STRICT_MODE_TYPE = symbolFor('react.strict_mode');
  REACT_PROFILER_TYPE = symbolFor('react.profiler');
  REACT_PROVIDER_TYPE = symbolFor('react.provider');
  REACT_CONTEXT_TYPE = symbolFor('react.context');
  REACT_FORWARD_REF_TYPE = symbolFor('react.forward_ref');
  REACT_SUSPENSE_TYPE = symbolFor('react.suspense');
  REACT_SUSPENSE_LIST_TYPE = symbolFor('react.suspense_list');
  REACT_MEMO_TYPE = symbolFor('react.memo');
  REACT_LAZY_TYPE = symbolFor('react.lazy');
  REACT_BLOCK_TYPE = symbolFor('react.block');
  REACT_SERVER_BLOCK_TYPE = symbolFor('react.server.block');
  REACT_FUNDAMENTAL_TYPE = symbolFor('react.fundamental');
  REACT_SCOPE_TYPE = symbolFor('react.scope');
  REACT_OPAQUE_ID_TYPE = symbolFor('react.opaque.id');
  REACT_DEBUG_TRACING_MODE_TYPE = symbolFor('react.debug_trace_mode');
  REACT_OFFSCREEN_TYPE = symbolFor('react.offscreen');
  REACT_LEGACY_HIDDEN_TYPE = symbolFor('react.legacy_hidden');
}

const MAYBE_ITERATOR_SYMBOL = typeof Symbol === 'function' && Symbol.iterator;
const FAUX_ITERATOR_SYMBOL = '@@iterator';

export function getIteratorFn(maybeIterable: ?any): ?() => ?Iterator<*> {
  if (maybeIterable === null || typeof maybeIterable !== 'object') {
    return null;
  }
  const maybeIterator =
    (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
    maybeIterable[FAUX_ITERATOR_SYMBOL];
  if (typeof maybeIterator === 'function') {
    return maybeIterator;
  }
  return null;
}
