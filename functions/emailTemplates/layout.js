exports.emailLayout = ({ title, content }) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
</head>

<body style="font-family:Arial,sans-serif;background:#f4f6f9;margin:0;padding:30px;">

<div style="max-width:600px;margin:auto;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">

<div style="background:#474adb;padding:24px;">
<h1 style="color:white;margin:0;">
ChurchCare
</h1>
</div>

<div style="padding:32px;">

${content}

</div>

<div style="background:#f9fafb;padding:20px;border-top:1px solid #e5e7eb;">

<p>© 2026 ChurchCare</p>

<p>
This email was sent automatically by ChurchCare.
</p>

<p>
<a href="mailto:support@bryeak.com">
support@bryeak.com
</a>
</p>

</div>

</div>

</body>
</html>
`;