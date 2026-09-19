import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import { app } from "../firebase";

const functions =
  getFunctions(app);

const _mergeMembers =
  httpsCallable(
    functions,
    "mergeMembers"
  );

export async function mergeMembers({
  organizationId,
  entityId,
  duplicateMemberId,
  masterMemberId,
}) {

  const result =
    await _mergeMembers({
      organizationId,
      entityId,
      duplicateMemberId,
      masterMemberId,
    });

  return result.data;
}
