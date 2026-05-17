const Document = require('../model/Document');
const MatchResult = require('../model/MatchResult');

async function runMatchEngine(poNumber) {
  const docs = await Document.find({ poNumber });
  
  const pos = docs.filter(d => d.documentType === 'po');
  const grns = docs.filter(d => d.documentType === 'grn');
  const invoices = docs.filter(d => d.documentType === 'invoice');

  let status = 'matched';
  const mismatches = [];

  if (pos.length > 1) {
    mismatches.push('duplicate_po');
    status = 'mismatch';
  }

 
  if (pos.length === 0 || grns.length === 0 || invoices.length === 0) {
    await MatchResult.findOneAndUpdate(
      { poNumber },
      { status: 'insufficient_documents', mismatches },
      { upsert: true }
    );
    return;
  }

  const po = pos[0].extractedData;
  const poItems = {};
  po.items.forEach(item => { poItems[item.itemCode] = item.quantity; });

  const grnItems = {};
  grns.forEach(g => {
    g.extractedData.items.forEach(item => {
      grnItems[item.itemCode] = (grnItems[item.itemCode] || 0) + (item.receivedQuantity || item.quantity);
    });
  });

  const invItems = {};
  invoices.forEach(i => {
    i.extractedData.items.forEach(item => {
      invItems[item.itemCode] = (invItems[item.itemCode] || 0) + item.quantity;
    });
  });

 
  const poDate = new Date(po.poDate);
  invoices.forEach(inv => {
    if (new Date(inv.extractedData.invoiceDate) > poDate) {
      mismatches.push('invoice_date_after_po_date');
    }
  });

  
  for (const itemCode in poItems) {
    const poQty = poItems[itemCode];
    const grnQty = grnItems[itemCode] || 0;
    const invQty = invItems[itemCode] || 0;

    if (grnQty > poQty) mismatches.push(`grn_qty_exceeds_po_qty:${itemCode}`);
    if (invQty > poQty) mismatches.push(`invoice_qty_exceeds_po_qty:${itemCode}`);
    if (invQty > grnQty) mismatches.push(`invoice_qty_exceeds_grn_qty:${itemCode}`);
    
   
    if ((grnQty < poQty || invQty < poQty) && status !== 'mismatch') {
      status = 'partially_matched';
    }
  }

  
  const checkingCodes = new Set([...Object.keys(grnItems), ...Object.keys(invItems)]);
  for (const code of checkingCodes) {
    if (!(code in poItems)) {
      mismatches.push(`item_missing_in_po:${code}`);
    }
  }

 
  const isBrokenCap = mismatches.some(m => m.includes('exceeds') || m.includes('missing') || m.includes('date'));
  if (isBrokenCap || mismatches.includes('duplicate_po')) {
    status = 'mismatch';
  }

  await MatchResult.findOneAndUpdate(
    { poNumber },
    { status, mismatches, lastUpdated: new Date() },
    { upsert: true }
  );
}

module.exports = { runMatchEngine };