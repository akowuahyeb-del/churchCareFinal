const {
  emailLayout,
} = require("./layout");

exports.announcementEmail =
({
  churchName,
  title,
  message,
}) =>
  emailLayout({

    title,

    content: `

<h2>
${title}
</h2>

<p>
From:
<b>${churchName}</b>
</p>

<div>
${message}
</div>

`,
  });
