import React from "react";
import MinistryLeadershipScreen
  from "./MinistryLeadershipScreen";

export default function CommitteeScreen(
  props
) {
  return (
    <MinistryLeadershipScreen
      {...props}
      entityType="committee"
      entityCollection="committees"
      title="Committees"
    />
  );
}