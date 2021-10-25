/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export type HookFlags = number;

export const NoFlags = /*  */ 0b000;

// Represents whether effect should fire.
// 代表效果是否应该被激发。
export const HasEffect = /* */ 0b001;

// Represents the phase in which the effect (not the clean-up) fires.
// 代表效果（不是清理）发射的阶段。
export const Layout = /*    */ 0b010;
export const Passive = /*   */ 0b100;
