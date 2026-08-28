
import React from "react";
import MinistryLeadershipScreen
  from "./MinistryLeadershipScreen";

export default function OfficeScreen(
  props
) {

  console.log(
    "OfficeScreen Loaded"
  );

  return (
    <MinistryLeadershipScreen
      {...props}
      entityType="office"
      entityCollection="offices"
      title="Church Offices"
    />
  );
}