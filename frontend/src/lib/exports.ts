import type { AuditDataset, MatchedDiscrepancy, SettingsState } from '../types';

export function triggerDownload(blob: Blob, filename: string): void {
  if (typeof window === 'undefined') return;
  const url: string = URL.createObjectURL(blob);
  const a: HTMLAnchorElement = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatCurrency(value: number): string {
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeCSV(value: string | number): string {
  const str: string = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function exportPDF(
  dataset: AuditDataset,
  settings: SettingsState,
  timestamp: string
): Blob {
  const lines: string[] = [];
  lines.push('OMNIVISE AUDIT REPORT');
  lines.push('='.repeat(60));
  lines.push(`Generated: ${timestamp}`);
  lines.push(`Accounting Standard: ${settings.accountingStandard}`);
  lines.push(`Materiality Threshold: ${formatCurrency(settings.materialityThreshold)}`);
  lines.push('');
  lines.push('--- DASHBOARD METRICS ---');
  lines.push(`Total Audited: ${dataset.metrics.totalAuditedFormatted}`);
  lines.push(`Flagged Variance: ${dataset.metrics.flaggedVarianceFormatted}`);
  lines.push(`Documents Processed: ${dataset.metrics.documentsCount}`);
  lines.push(`Discrepancies Found: ${dataset.metrics.discrepanciesCount}`);
  lines.push(`Critical Items: ${dataset.metrics.criticalCount}`);
  lines.push(`Average Confidence: ${(dataset.metrics.averageConfidence * 100).toFixed(0)}%`);
  lines.push('');
  lines.push('--- DISCREPANCIES ---');
  for (const d of dataset.discrepancies) {
    lines.push(`[${d.severity.toUpperCase()}] ${d.id} — ${d.accountingCategory}`);
    lines.push(`  Field: ${d.field}`);
    lines.push(`  PO Value: ${d.poValue} | Invoice Value: ${d.invoiceValue}`);
    lines.push(`  Delta: ${d.deltaFormatted} | Confidence: ${(d.confidence * 100).toFixed(0)}%`);
    lines.push(`  Root Cause: ${d.rootCause}`);
    lines.push(`  Period: ${d.reportingPeriod || 'N/A'}`);
    lines.push('');
  }
  lines.push('--- DOCUMENTS ---');
  for (const doc of dataset.documents) {
    lines.push(`${doc.filename} (${doc.kind}) — ${doc.vendor}`);
    lines.push(`  Amount: ${formatCurrency(doc.totalAmount)} | Status: ${doc.status}`);
    lines.push(`  Issued: ${doc.issueDate} | Uploaded: ${doc.uploadedAt}`);
    lines.push('');
  }
  lines.push('='.repeat(60));
  lines.push('End of Report — OmniVise AI Audit Platform');
  return new Blob([lines.join('\n')], { type: 'application/pdf' });
}

export function exportCSV(discrepancies: MatchedDiscrepancy[]): Blob {
  const headers: readonly string[] = [
    'ID',
    'Accounting Category',
    'Field',
    'Severity',
    'Confidence',
    'PO Value',
    'Invoice Value',
    'Delta',
    'Delta Formatted',
    'Root Cause',
    'Accounting Category',
    'Reporting Period',
    'Documents',
    'Audit Evidence',
  ];
  const rows: string[] = [headers.map(escapeCSV).join(',')];
  for (const d of discrepancies) {
    const row: string[] = [
      d.id,
      d.accountingCategory,
      d.field,
      d.severity,
      (d.confidence * 100).toFixed(1) + '%',
      String(d.poValue),
      String(d.invoiceValue),
      String(d.delta),
      d.deltaFormatted,
      d.rootCause,
      d.accountingCategory,
      d.reportingPeriod || '',
      d.documents.join(' | '),
      d.auditEvidence,
    ];
    rows.push(row.map(escapeCSV).join(','));
  }
  return new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
}

export function exportJSON(state: unknown): Blob {
  const payload: { exportedAt: string; state: unknown } = {
    exportedAt: new Date().toISOString(),
    state,
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}
