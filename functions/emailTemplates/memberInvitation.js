const {
  emailLayout,
} = require("./layout");

exports.memberInvitationEmail =
({
  memberName,
  churchName,
  inviteCode,
  invitationUrl,
}) =>
  emailLayout({

    title:
      "Church Membership Invitation",

    actionText:
      "Accept Invitation",

    actionUrl:
      invitationUrl,

    content: `

<h2>
You've Been Invited to Join
${churchName}
</h2>

<p>
Hello ${memberName},
</p>

<p>
You have been invited to become a member of:
</p>

<p>
<b>${churchName}</b>
</p>

<p>
Invitation Code:
<b>${inviteCode}</b>
</p>


<p>
Invitation Code:
<b>${inviteCode}</b>
</p>

<p>
Click the button below to continue your membership registration.
</p>

<p style="margin-top:30px;">
  <a
    href="${invitationUrl || 'https://churchcare.app'}"
    style="
      background:#334be6;
      color:white;
      text-decoration:none;
      padding:14px 24px;
      border-radius:8px;
      display:inline-
      font-weight:bold;
    "
  >
    Accept Invitation
  </a>
</p>
`,
  });
