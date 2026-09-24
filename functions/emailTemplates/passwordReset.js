const {
  emailLayout,
} = require("./layout");

exports.passwordResetEmail =
({
  resetCode,
}) =>
  emailLayout({

    title:
      "Password Reset",

    content: `

<h2>
Reset Your Password
</h2>

<p>
A password reset request was received.
</p>

<p>
Reset Code:
<b>${resetCode}</b>
</p>

<p>
If you did not request this action,
please ignore this email.
</p>

`,
  });