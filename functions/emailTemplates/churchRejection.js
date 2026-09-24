const {
  emailLayout,
} = require("./layout");

exports.churchRejectionEmail =
({
  churchName,
  reason,
}) =>
  emailLayout({

    title:
      "Church Registration Update",

    content: `

<h2>
Church Registration Update
</h2>

<p>
Thank you for registering
<b>${churchName}</b>.
</p>

<p>
Unfortunately your application
could not be approved at this time.
</p>

<p>
Reason:
<b>${reason}</b>
</p>

<p>
Please review and resubmit.
</p>

`,
  });
