function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function row(label, value) {
  return `
    <tr>
      <th>${escapeHtml(label)}</th>
      <td>${escapeHtml(value)}</td>
    </tr>
  `;
}

export function streamPaymentReceipt(res, payment) {
  const issuedAt = new Date(payment.createdAt).toLocaleString();
  const attendeeName = payment.userId?.name || 'N/A';
  const attendeeEmail = payment.userId?.email || 'N/A';
  const details = payment.paymentDetails || {};
  let methodDetails = 'N/A';

  if (payment.method === 'card' && details.cardLast4) {
    methodDetails = `${details.cardName || 'Card'} ending in ${details.cardLast4}`;
    if (details.cardExpiry) {
      methodDetails += ` (Exp ${details.cardExpiry})`;
    }
  } else if (payment.method === 'netbanking') {
    methodDetails = [details.bankName, details.accountHolder && `A/C ${details.accountHolder}`]
      .filter(Boolean)
      .join(' - ') || 'N/A';
  } else if (payment.method === 'upi' && details.upiId) {
    methodDetails = `${details.provider || 'UPI'} - ${details.upiId}`;
  } else if (payment.method === 'cash' && details.referenceNote) {
    methodDetails = details.referenceNote;
  }

  const refundSection =
    payment.status === 'refunded'
      ? row('Refund Reason', payment.refundReason || 'Refunded by admin')
      : '';

  const html = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Receipt ${escapeHtml(payment._id)}</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f6f7fb; color: #172033; margin: 0; padding: 32px; }
        .card { max-width: 760px; margin: 0 auto; background: #fff; border-radius: 18px; padding: 32px; box-shadow: 0 18px 48px rgba(23,32,51,.10); }
        .header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 24px; }
        .brand { font-size: 28px; font-weight: 700; }
        .muted { color: #667085; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { text-align: left; padding: 12px 0; border-bottom: 1px solid #e9eef5; vertical-align: top; }
        th { width: 220px; color: #667085; font-weight: 600; }
        .status { display: inline-block; padding: 6px 12px; border-radius: 999px; background: #efe7ff; color: #5b35c5; font-weight: 700; text-transform: uppercase; font-size: 12px; letter-spacing: .04em; }
        .footer { margin-top: 28px; color: #667085; font-size: 13px; }
        .actions { margin-top: 24px; display: flex; gap: 12px; }
        .btn { border: 0; border-radius: 999px; padding: 10px 16px; font-weight: 600; cursor: pointer; }
        .btn-primary { background: #5b35c5; color: #fff; }
        .btn-secondary { background: #eef2ff; color: #334155; }
        @media print { body { background: #fff; padding: 0; } .card { box-shadow: none; padding: 0; } .actions { display: none; } }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div>
            <div class="brand">GatherUp Receipt</div>
            <div class="muted">Generated from the unified event management system.</div>
          </div>
          <div>
            <div class="status">${escapeHtml(payment.status)}</div>
          </div>
        </div>

        <table>
          ${row('Receipt ID', payment._id)}
          ${row('Issued At', issuedAt)}
          ${row('Attendee', attendeeName)}
          ${row('Email', attendeeEmail)}
          ${row('Event', payment.eventName)}
          ${row('Amount', `Rs. ${Number(payment.amount).toFixed(2)}`)}
          ${row('Payment Method', String(payment.method || '').toUpperCase())}
          ${row('Method Details', methodDetails)}
          ${row('Transaction ID', payment.transactionId || 'N/A')}
          ${refundSection}
        </table>

        <div class="actions">
          <button class="btn btn-primary" onclick="window.print()">Print / Save PDF</button>
          <button class="btn btn-secondary" onclick="window.close()">Close</button>
        </div>

        <div class="footer">
          Thank you for using GatherUp. This receipt can be printed or saved as PDF from your browser.
        </div>
      </div>
    </body>
  </html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}
