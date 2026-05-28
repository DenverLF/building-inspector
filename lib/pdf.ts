// PDF generation helpers — runs client-side only (browser)
import type { Inspection, KmLog } from '@/lib/types'

const STAGE_LABEL: Record<string, string> = {
  fire_installation: 'Fire Installation',
  trench: 'Trench',
  drainage: 'Drainage',
  permission_to_use: 'Permission to Use',
  occupation: 'Occupation',
}

const OUTCOME_LABEL: Record<string, string> = {
  pass: 'Pass',
  fail: 'Fail',
  attention_required: 'Attention Required',
  pending: 'Pending',
}

function header(doc: InstanceType<typeof import('jspdf')['jsPDF']>, title: string, subtitle: string) {
  // Dark navy bar
  doc.setFillColor(26, 23, 69)
  doc.rect(0, 0, 210, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Municipality of Excellence', 14, 11)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Building Inspectorate', 14, 18)

  // Report title on right
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 196, 11, { align: 'right' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(subtitle, 196, 18, { align: 'right' })

  // Reset text colour
  doc.setTextColor(0, 0, 0)
}

function footer(doc: InstanceType<typeof import('jspdf')['jsPDF']>) {
  const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Generated ${new Date().toLocaleString('en-ZA')} · Page ${i} of ${pageCount}`,
      105,
      292,
      { align: 'center' }
    )
    doc.setTextColor(0, 0, 0)
  }
}

export async function generateInspectionsReport(
  inspections: Inspection[],
  dateFrom: string,
  dateTo: string,
  inspectorFilter: string
) {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const subtitle = inspectorFilter
    ? `${dateFrom} – ${dateTo} · ${inspectorFilter}`
    : `${dateFrom} – ${dateTo}`

  header(doc, 'Inspections Report', subtitle)

  // Summary row
  const pass = inspections.filter(i => i.outcome === 'pass').length
  const fail = inspections.filter(i => i.outcome === 'fail').length
  const attn = inspections.filter(i => i.outcome === 'attention_required').length

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text(`Total: ${inspections.length}   Pass: ${pass}   Fail: ${fail}   Attention: ${attn}`, 14, 36)
  doc.setTextColor(0, 0, 0)

  autoTable(doc, {
    startY: 41,
    head: [['Date', 'Stage', 'Outcome', 'Address', 'Inspector', 'Notes']],
    body: inspections.map(i => [
      new Date(i.inspected_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }),
      STAGE_LABEL[i.stage] ?? i.stage,
      OUTCOME_LABEL[i.outcome] ?? i.outcome,
      i.address ?? '—',
      i.inspector_name ?? '—',
      i.notes ? (i.notes.length > 60 ? i.notes.slice(0, 57) + '…' : i.notes) : '—',
    ]),
    headStyles: { fillColor: [26, 23, 69], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: [30, 30, 30] },
    alternateRowStyles: { fillColor: [248, 247, 255] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 30 },
      2: { cellWidth: 24 },
      3: { cellWidth: 40 },
      4: { cellWidth: 30 },
      5: { cellWidth: 40 },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didDrawCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 2) {
        const outcome = String((data.row.raw as string[])[2])
        if (outcome === 'Pass') data.cell.styles.textColor = [22, 163, 74]
        else if (outcome === 'Fail') data.cell.styles.textColor = [220, 38, 38]
        else if (outcome === 'Attention Required') data.cell.styles.textColor = [234, 88, 12]
      }
    },
    margin: { left: 14, right: 14 },
  })

  footer(doc)
  doc.save(`inspections-report-${dateFrom}-${dateTo}.pdf`)
}

export async function generateKmReport(
  logs: KmLog[],
  month: string,
  inspectorFilter: string
) {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const subtitle = inspectorFilter ? `${month} · ${inspectorFilter}` : month

  header(doc, 'Kilometre Log Report', subtitle)

  const totalKm = logs.reduce((s, l) => s + Number(l.distance_km), 0)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text(`Total trips: ${logs.length}   Total distance: ${totalKm % 1 === 0 ? totalKm : totalKm.toFixed(1)} km`, 14, 36)
  doc.setTextColor(0, 0, 0)

  autoTable(doc, {
    startY: 41,
    head: [['Date', 'Inspector', 'From', 'To', 'Distance', 'Purpose']],
    body: logs.map(l => [
      new Date(l.trip_date + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }),
      l.inspector_name ?? '—',
      l.start_location,
      l.end_location,
      `${l.distance_km} km`,
      l.purpose ?? '—',
    ]),
    headStyles: { fillColor: [26, 23, 69], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: [30, 30, 30] },
    alternateRowStyles: { fillColor: [248, 247, 255] },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 34 },
      2: { cellWidth: 38 },
      3: { cellWidth: 38 },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 28 },
    },
    foot: [[
      { content: 'TOTAL', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right', fillColor: [26, 23, 69], textColor: 255 } },
      { content: `${totalKm % 1 === 0 ? totalKm : totalKm.toFixed(1)} km`, styles: { fontStyle: 'bold', halign: 'right', fillColor: [26, 23, 69], textColor: 255 } },
      { content: '', styles: { fillColor: [26, 23, 69] } },
    ]],
    showFoot: 'lastPage',
    margin: { left: 14, right: 14 },
  })

  footer(doc)
  doc.save(`km-log-${month}.pdf`)
}
