// utils/receiptGenerator.js
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const buildReceiptHtml = (donation, churchName) => {
  const {
    memberName, amount, type, method, methodLabel,
    momoProvider, reference, note, date, acknowledgedByName, acknowledgedAt
  } = donation;

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 40px; color: #222; }
          .header { text-align: center; margin-bottom: 30px; }
          .church { font-size: 22px; font-weight: 800; color: #4B3F72; }
          .title { font-size: 14px; color: #888; margin-top: 4px; letter-spacing: 1px; text-transform: uppercase; }
          .amount-box { text-align: center; background: #f4f6fb; border-radius: 12px; padding: 24px; margin: 24px 0; }
          .amount { font-size: 36px; font-weight: 900; color: #27ae60; }
          .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .label { color: #888; font-size: 13px; }
          .value { color: #222; font-size: 13px; font-weight: 600; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-top: 20px; }
          .acknowledged { background: #e8f8f0; color: #27ae60; }
          .pending { background: #fff3e0; color: #e67e22; }
          .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #aaa; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="church">${churchName || "Church"}</div>
          <div class="title">Donation Receipt</div>
        </div>

        <div class="amount-box">
          <div class="amount">GH₵ ${Number(amount || 0).toLocaleString()}</div>
        </div>

        <div class="row"><span class="label">Donor</span><span class="value">${memberName || "Anonymous"}</span></div>
        <div class="row"><span class="label">Category</span><span class="value">${type || "—"}</span></div>
        <div class="row"><span class="label">Date</span><span class="value">${date || "—"}</span></div>
        <div class="row"><span class="label">Payment Method</span><span class="value">${methodLabel || method || "—"}</span></div>
        ${momoProvider ? `<div class="row"><span class="label">Mobile Money Provider</span><span class="value">${momoProvider}</span></div>` : ""}
        ${reference ? `<div class="row"><span class="label">Reference</span><span class="value">${reference}</span></div>` : ""}
        ${note ? `<div class="row"><span class="label">Note</span><span class="value">${note}</span></div>` : ""}

        <div style="text-align:center;">
          <span class="status ${acknowledgedByName ? "acknowledged" : "pending"}">
            ${acknowledgedByName
              ? `✓ Acknowledged by ${acknowledgedByName}${acknowledgedAt ? ` on ${acknowledgedAt}` : ""}`
              : "Pending Acknowledgment"}
          </span>
        </div>

        <div class="footer">This receipt was generated automatically. Keep it for your records.</div>
      </body>
    </html>
  `;
};

export const generateDonationReceipt = async (donation, churchName) => {
  try {
    const html = buildReceiptHtml(donation, churchName);
    const { uri } = await Print.printToFileAsync({ html });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Donation Receipt",
      });
    }
    return uri;
  } catch (e) {
    console.log("❌ Receipt generation error:", e);
    throw e;
  }
};