/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {enableCreateEventHandleAPI} from 'shared/ReactFeatureFlags';

export type Flags = number;

// Don't change these two values. They're used by React Dev Tools.
export const NoFlags = /*                      */ 0b0000000000000000000;
export const PerformedWork = /*                */ 0b0000000000000000001;

// You can change the rest (and add more).
// DOM需要插入到页面中
export const Placement = /*                    */ 0b0000000000000000010;
// DOM需要耿勋
export const Update = /*                       */ 0b0000000000000000100;
// DOM需要插入到页面中并更新
export const PlacementAndUpdate = /*           */ 0b0000000000000000110;
// DOM需要删除
export const Deletion = /*                     */ 0b0000000000000001000;
export const ContentReset = /*                 */ 0b0000000000000010000;
export const Callback = /*                     */ 0b0000000000000100000;
export const DidCapture = /*                   */ 0b0000000000001000000;
export const Ref = /*                          */ 0b0000000000010000000;
export const Snapshot = /*                     */ 0b0000000000100000000;
export const Passive = /*                      */ 0b0000000001000000000;
export const Hydrating = /*                    */ 0b0000000010000000000;
export const HydratingAndUpdate = /*           */ 0b0000000010000000100;
export const Visibility = /*                   */ 0b0000000100000000000;

export const LifecycleEffectMask = Passive | Update | Callback | Ref | Snapshot;

// Union of all commit flags (flags with the lifetime of a particular commit)
export const HostEffectMask = /*               */ 0b0000000111111111111;

// These are not really side effects, but we still reuse this field.
export const Incomplete = /*                   */ 0b0000001000000000000;
export const ShouldCapture = /*                */ 0b0000010000000000000;
// TODO (effects) Remove this bit once the new reconciler is synced to the old.
export const PassiveUnmountPendingDev = /*     */ 0b0000100000000000000;
export const ForceUpdateForLegacySuspense = /* */ 0b0001000000000000000;

// Static tags describe aspects of a fiber that are not specific to a render,
// e.g. a fiber uses a passive effect (even if there are no updates on this particular render).
// This enables us to defer more work in the unmount case,
// since we can defer traversing the tree during layout to look for Passive effects,
// and instead rely on the static flag as a signal that there may be cleanup work.
export const PassiveStatic = /*                */ 0b0010000000000000000;

// These flags allow us to traverse to fibers that have effects on mount
// without traversing the entire tree after every commit for
// double invoking
export const MountLayoutDev = /*               */ 0b0100000000000000000;
export const MountPassiveDev = /*              */ 0b1000000000000000000;

// Groups of flags that are used in the commit phase to skip over trees that
// don't contain effects, by checking subtreeFlags.

export const BeforeMutationMask =
  Snapshot |
  (enableCreateEventHandleAPI
    ? // createEventHandle needs to visit deleted and hidden trees to
      // fire beforeblur
      // TODO: Only need to visit Deletions during BeforeMutation phase if an
      // element is focused.
      Deletion | Visibility
    : 0);

export const MutationMask =
  Placement | Update | Deletion | ContentReset | Ref | Hydrating | Visibility;
export const LayoutMask = Update | Callback | Ref;
export const PassiveMask = Passive | Deletion;

// Union of tags that don't get reset on clones.
// This allows certain concepts to persist without recalculting them,
// e.g. whether a subtree contains passive effects or portals.
export const StaticMask = PassiveStatic;
