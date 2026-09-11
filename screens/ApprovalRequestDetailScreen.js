import React from "react";
import { db } from "../firebase";
import AsyncStorage
  from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  arrayUnion,
  addDoc,
  collection,
} from "firebase/firestore";


import AppHeader from "../components/AppHeader";

export default function ApprovalRequestDetailScreen({
  navigation,
  route,
}) {


const [showRejectModal,
  setShowRejectModal] =
  React.useState(false);

const [rejectionNote,
  setRejectionNote] =
  React.useState("");

  const request =
    route?.params?.request || {};
    const isTransferRequest =
  request?.type === "transfer";

    React.useEffect(() => {

  if (
    request?.type === "transfer"
  ) {

    navigation.replace(
      "TransferManagement"
    );

  }

}, []);

const executeGovernanceRequest = async (
  request,
  organizationId
) => {

  if (!request) return;

  //
  // ADD MEMBER
  //
  if (
    request.nominationType === "membership" &&
    request.actionType === "add"
  ) {

    await addDoc(
      collection(
        db,
        "organizations",
        organizationId,
        "governanceMemberships"
      ),
      {
        governanceBodyId:
          request.governanceBodyId,

        governanceBodyName:
          request.governanceBodyName,

        memberId:
          request.memberId,

        memberName:
          request.memberName,

        membershipRole:
          request.governanceBodyName,

        category:
          request.category || "member",

        status: "active",

        startDate:
          new Date().toISOString(),

        createdAt:
          new Date().toISOString(),
      }
    );

    return;
  }

  //
  // REPLACE MEMBER
  //
  if (
    request.nominationType === "membership" &&
    request.actionType === "replace"
  ) {

    const snap =
      await getDocs(
        collection(
          db,
          "organizations",
          organizationId,
          "governanceMemberships"
        )
      );

    const outgoing =
      snap.docs.find((d) => {

        const data = d.data();

        return (
          data.memberId ===
            request.replacingMemberId &&
          data.governanceBodyId ===
            request.governanceBodyId &&
          data.status === "active"
        );

      });

    if (outgoing) {

      await updateDoc(
        doc(
          db,
          "organizations",
          organizationId,
          "governanceMemberships",
          outgoing.id
        ),
        {
          status: "inactive",
          endDate:
            new Date().toISOString(),
        }
      );

    }

    await addDoc(
      collection(
        db,
        "organizations",
        organizationId,
        "governanceMemberships"
      ),
      {
        governanceBodyId:
          request.governanceBodyId,

        governanceBodyName:
          request.governanceBodyName,

        memberId:
          request.memberId,

        memberName:
          request.memberName,

        membershipRole:
          request.governanceBodyName,

        category:
          request.category || "member",

        status: "active",

        startDate:
          new Date().toISOString(),

        createdAt:
          new Date().toISOString(),
      }
    );

      return;
  }

  //
  // REMOVE MEMBER
  //
  if (
    request.nominationType === "membership" &&
    request.actionType === "remove"
  ) {

    const snap =
      await getDocs(
        collection(
          db,
          "organizations",
          organizationId,
          "governanceMemberships"
        )
      );

    const member =
      snap.docs.find((d) => {

        const data = d.data();

        return (
          data.memberId ===
            request.memberId &&
          data.governanceBodyId ===
            request.governanceBodyId &&
          data.status === "active"
        );

      });

    if (member) {

      await updateDoc(
        doc(
          db,
          "organizations",
          organizationId,
          "governanceMemberships",
          member.id
        ),
        {
          status: "inactive",
          endDate:
            new Date().toISOString(),
        }
      );

    }

    return;
  }

  //
  // RESTORE MEMBER
  //
  if (
    request.nominationType === "membership" &&
    request.actionType === "restore"
  ) {

    await addDoc(
      collection(
        db,
        "organizations",
        organizationId,
        "governanceMemberships"
      ),
      {
        governanceBodyId:
          request.governanceBodyId,

        governanceBodyName:
          request.governanceBodyName,

        memberId:
          request.memberId,

        memberName:
          request.memberName,

        category:
          request.category || "member",

        status: "active",

        historical: false,

        appointmentType:
          "restored",

        startDate:
          new Date().toISOString(),

        createdAt:
          new Date().toISOString(),
      }
    );

    return;
  }

};





const handleApprove = async () => {

  try {

    const stored =
      await AsyncStorage.getItem(
        "activeEntity"
      );

    if (!stored) {

      Alert.alert(
        "Error",
        "No active church selected."
      );

      return;
    }

    const entity =
      JSON.parse(stored);

      console.log(
  "ACTIVE ENTITY:",
  entity
);
      const approverId =
  entity.memberId;

if (!approverId) {

  Alert.alert(
    "Error",
    "Approver identity not found."
  );

  return;
}

    const requestRef =
      doc(
        db,
        "organizations",
        entity.organizationId,
        "approvalRequests",
        request.id
      );

   if (
  (request.approvals || [])
    .includes(approverId)
) {

  Alert.alert(
    "Already Approved",
    "You have already approved this request."
  );

  return;
}

await updateDoc(
  requestRef,
  {
    approvals: arrayUnion(
      approverId
    ),
  }
);


    const governanceBodyRef =
      doc(
        db,
        "organizations",
        entity.organizationId,
        "governanceBodies",
        request.governanceBodyId
      );

    const governanceBodySnap =
      await getDoc(
        governanceBodyRef
      );

    if (
      !governanceBodySnap.exists()
    ) {

      Alert.alert(
        "Error",
        "Governance body configuration not found."
      );

      return;
    }

    const governanceBody =
      governanceBodySnap.data();

    const approvalCount =
  (
    request.approvals || []
  ).filter(
    (id) => id !== approverId
  ).length + 1;

    const threshold =
      request.nominationType ===
      "leadership"
        ? (
            governanceBody
              .leadershipApprovalThreshold || 1
          )
        : (
            governanceBody
              .membershipApprovalThreshold || 1
          );

          const decisionModel =
  governanceBody?.decisionModel ||
  "threshold";

const rejectionThreshold =
  governanceBody?.rejectionThreshold ||
  1;

const approvals =
  request.approvals || [];

const rejections =
  request.rejections || [];
let approved = false;

if (
  decisionModel === "threshold"
) {

  approved =
    approvalCount >= threshold;

} else if (
  decisionModel === "majority"
) {

  approved =
    approvalCount >
    rejections.length;

} else if (
  decisionModel === "consensus"
) {

  approved =
    rejections.length === 0 &&
    approvalCount >= threshold;

} else if (
  decisionModel === "unanimous"
) {

  approved =
    rejections.length === 0 &&
    approvalCount >= threshold;

}

if (approved) {


  await updateDoc(
    requestRef,
    {
      status: "approved",
      approvedAt:
        new Date().toISOString(),
    }
  );

  await executeGovernanceRequest(
    request,
    entity.organizationId
  );
  await addDoc(
  collection(
    db,
    "organizations",
    entity.organizationId,
    "governanceAudit"
  ),
  {
    actionType:
      request.actionType || "unknown",


    nominationType:
      request.nominationType,

    governanceBodyId:
      request.governanceBodyId,

    governanceBodyName:
      request.governanceBodyName,

    memberId:
      request.memberId,

    memberName:
      request.memberName,

    approvalRequestId:
      request.id,

    executedAt:
      new Date().toISOString(),
  }
);

  Alert.alert(
    "Approved",
    "Governance request executed."
  );

} else {

  Alert.alert(
    "Rejection Recorded",
    `${rejectionCount} of ${rejectionThreshold} rejections recorded.`
  );

}

  } catch (error) {

    Alert.alert(
      "Error",
      error.message
    );

  }

};

const handleReject = async () => {

  try {

    const stored =
      await AsyncStorage.getItem(
        "activeEntity"
      );

    if (!stored) {

      Alert.alert(
        "Error",
        "No active church selected."
      );

      return;
    }

    const entity =
      JSON.parse(stored);

    const rejectorId =
      entity.memberId;

    if (!rejectorId) {

      Alert.alert(
        "Error",
        "Rejector identity not found."
      );

      return;
    }

    const requestRef =
      doc(
        db,
        "organizations",
        entity.organizationId,
        "approvalRequests",
        request.id
      );

    if (
      (request.rejections || [])
        .includes(rejectorId)
    ) {

      Alert.alert(
        "Already Rejected",
        "You have already rejected this request."
      );

      return;
    }

    await updateDoc(
      requestRef,
      {
        rejections: arrayUnion(
          rejectorId
        ),

        rejectionHistory:
          arrayUnion({
            memberId:
              rejectorId,

            memberName:
              entity.memberName ||
              "Unknown",

            note:
              rejectionNote.trim() ||
              null,

            rejectedAt:
              new Date()
                .toISOString(),
          }),
      }
    );

    const rejectionCount =
      (
        request.rejections || []
      ).length + 1;

    const governanceBodyRef =
      doc(
        db,
        "organizations",
        entity.organizationId,
        "governanceBodies",
        request.governanceBodyId
      );

    const governanceBodySnap =
      await getDoc(
        governanceBodyRef
      );

    if (
      !governanceBodySnap.exists()
    ) {

      Alert.alert(
        "Error",
        "Governance body configuration not found."
      );

      return;
    }

    const governanceBody =
      governanceBodySnap.data();

    const rejectionThreshold =
      governanceBody
        ?.rejectionThreshold || 1;

    if (
      rejectionCount >=
      rejectionThreshold
    ) {

      await updateDoc(
        requestRef,
        {
          status: "rejected",

          rejectedAt:
            new Date()
              .toISOString(),

          rejectionNote:
            rejectionNote.trim() ||
            null,
        }
      );

      setShowRejectModal(false);

      Alert.alert(
        "Rejected",
        "Request rejected.",
        [
          {
            text: "OK",
            onPress: () =>
              navigation.goBack(),
          },
        ]
      );

    } else {

      setShowRejectModal(false);

      Alert.alert(
        "Rejection Recorded",
        `${rejectionCount} of ${rejectionThreshold} rejections recorded.`
      );

    }

  } catch (error) {

    Alert.alert(
      "Error",
      error.message
    );

  }

};

  return (
    <View style={{ flex: 1 }}>

      <AppHeader
  title={
    isTransferRequest
      ? "Transfer Request"
      : "Approval Request"
  }
        subtitle={
          request.nominationType ||
          "Request"
        }
        onBack={() =>
          navigation.goBack()
        }
      />

      <ScrollView
        contentContainerStyle={{
          padding: 16,
        }}
      >

        <Text>
          Member:
        </Text>

        <Text>
          {request.memberName}
        </Text>

       {isTransferRequest ? (
  <>
    <Text
      style={{
        marginTop: 16,
      }}
    >
      From:
    </Text>

    <Text>
      {request.fromEntityName}
    </Text>

    <Text
      style={{
        marginTop: 16,
      }}
    >
      To:
    </Text>

    <Text>
      {request.toEntityName ||
        "Unknown / To Be Determined"}
    </Text>
  </>
) : (
  <>
    <Text
      style={{
        marginTop: 16,
      }}
    >
      Governance Body:
    </Text>

    <Text>
      {request.governanceBodyName}
    </Text>
  </>
)}

        <Text>
          {request.governanceBodyName}
        </Text>

        <Text
          style={{
            marginTop: 16,
          }}
        >
          Requested By:
        </Text>

        <Text>
          {request.requestedByName ||
            "Unknown"}
        </Text>

        <Text
          style={{
            marginTop: 16,
          }}
        >
          Request Type:
        </Text>

        <Text>
          {request.nominationType}
        </Text>

        <Text
          style={{
            marginTop: 16,
          }}
        >
          Status:
        </Text>

        <Text>
          {request.status}
        </Text>


<Text
  style={{
    marginTop: 8,
  }}
>
  Approvals Recorded:
  {" "}
  {(request.approvals || []).length}
</Text>

<Text>
 Rejections Recorded:
{" "}
{(request.rejections || []).length}
</Text>

        <TouchableOpacity
          style={{
            backgroundColor: "#2E7D32",
            padding: 14,
            borderRadius: 10,
            marginTop: 24,
            alignItems: "center",
          }}
          onPress={handleApprove}
        >
          <Text
            style={{
              color: "#FFF",
              fontWeight: "700",
            }}
          >
            Approve
          </Text>
        </TouchableOpacity>

       <TouchableOpacity
  style={{
    backgroundColor: "#B00020",
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
    alignItems: "center",
  }}
  onPress={() =>
  setShowRejectModal(true)
}
>
          <Text
            style={{
              color: "#FFF",
              fontWeight: "700",
            }}
          >
            Reject
          </Text>
        </TouchableOpacity>
        <Modal
  visible={showRejectModal}
  transparent={true}
  animationType="slide"
>

  <View
    style={{
      flex: 1,
      justifyContent: "center",
      backgroundColor:
        "rgba(0,0,0,0.5)",
      padding: 20,
    }}
  >

    <View
      style={{
        backgroundColor: "#FFF",
        borderRadius: 12,
        padding: 20,
      }}
    >

      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          marginBottom: 12,
        }}
      >
        Reject Request
      </Text>

      <Text
        style={{
          marginBottom: 10,
        }}
      >
        Internal Note (Optional)
      </Text>

      <TextInput
        style={{
          borderWidth: 1,
          borderColor: "#DDD",
          borderRadius: 10,
          padding: 12,
          minHeight: 100,
          textAlignVertical: "top",
        }}
        multiline
        value={rejectionNote}
        onChangeText={
          setRejectionNote
        }
        placeholder="Reason for rejection..."
      />

      <TouchableOpacity
        style={{
          backgroundColor: "#B00020",
          padding: 14,
          borderRadius: 10,
          marginTop: 16,
        }}
        onPress={async () => {

          setShowRejectModal(false);

          await handleReject();


        }}
      >
        <Text
          style={{
            color: "#FFF",
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          Reject
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          marginTop: 12,
        }}
        onPress={() => {

          setShowRejectModal(false);

          setRejectionNote("");

        }}
      >
        <Text
          style={{
            textAlign: "center",
          }}
        >
          Cancel
        </Text>
      </TouchableOpacity>

    </View>

  </View>

</Modal>

      </ScrollView>

    </View>
  );
}