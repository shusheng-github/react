/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

export type PriorityLevel = 0 | 1 | 2 | 3 | 4 | 5;

// TODO: Use symbols?
// 初始化时候的无优先级
export const NoPriority = 0;
// 立即执行的优先级，级别最高
export const ImmediatePriority = 1;
// 用户阻塞级别的优先级
export const UserBlockingPriority = 2;
// 正常的优先级runWithPriority
export const NormalPriority = 3;
// 较低的优先级
export const LowPriority = 4;
// 优先级最低，表示任务可以闲置
export const IdlePriority = 5;
