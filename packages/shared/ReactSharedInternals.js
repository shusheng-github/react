/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// 源码，本地debug源码需要
// import * as React from 'react';

// const ReactSharedInternals =
//   React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

// 非源码，本地debug源码需要
import ReactSharedInternals from 'react/src/ReactSharedInternalsClient'
// const ReactSharedInternals =
//   React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

export default ReactSharedInternals;
