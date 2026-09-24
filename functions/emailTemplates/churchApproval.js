const {
  emailLayout,
} = require("./layout");

exports.churchApprovalEmail =
({
  churchName,
  organisationCode,
}) =>
  emailLayout({

    title:
      "Church Registration Approved",

    content: `

<h2>
Church Registration Approved ✅
</h2>

<p>
Congratulations!
</p>

<p>
<b>${churchName}</b>
has been approved.
</p>

<p>
Organisation Code:
<b>${organisationCode}</b>
</p>

<p>
You may now continue onboarding.
</p>

<p>
Welcome to ChurchCare.
</p>

<p style="margin-top:30px;">
  <a
    href="https://churchcare.app"
    style="
      background:#334be6;
      color:white;
      text-decoration:none;
      padding:14px 24px;
      border-radius:8px;
      display:inline-block;
      font-weight:bold;
    "
  >
    Open ChurchCare
  </a>
</p>

`,
  });
