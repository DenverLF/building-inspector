// PDF generation helpers — runs client-side only (browser)
import type { Inspection, KmLog, Notice, NoticeStatus, NoticeAttachment } from '@/lib/types'

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

async function fetchImageDataUrl(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url)
    const blob = await resp.blob()
    return await new Promise<string>(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function generateNotice(notice: Notice, attachments: NoticeAttachment[] = []) {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // Header bar
  doc.setFillColor(26, 23, 69)
  doc.rect(0, 0, 210, 32, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Municipality of Excellence', 14, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Building Inspectorate', 14, 20)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('NON-COMPLIANCE NOTICE', 196, 12, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Ref: ${notice.reference_number}`, 196, 20, { align: 'right' })
  doc.setTextColor(0, 0, 0)

  let y = 44

  // Status badge
  const statusColor: Record<string, [number, number, number]> = {
    draft: [107, 114, 128],
    sent: [59, 130, 246],
    resolved: [34, 197, 94],
  }
  doc.setFillColor(...statusColor[notice.status])
  doc.roundedRect(14, y - 5, 24, 7, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text(notice.status.toUpperCase(), 26, y, { align: 'center' })
  doc.setTextColor(0, 0, 0)
  y += 8

  // Issued date
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`Issued: ${new Date(notice.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, y)
  if (notice.sent_at) {
    doc.text(`Sent: ${new Date(notice.sent_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}`, 110, y)
  }
  doc.setTextColor(0, 0, 0)
  y += 10

  // Separator line
  doc.setDrawColor(200, 200, 200)
  doc.line(14, y, 196, y)
  y += 8

  // Property owner section
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('ADDRESSED TO', 14, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(notice.property_owner_name ?? 'The Property Owner / Responsible Party', 14, y)
  y += 6
  if (notice.property_owner_email) {
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(notice.property_owner_email, 14, y)
    doc.setTextColor(0, 0, 0)
    y += 6
  }
  y += 4

  // Site details box
  doc.setFillColor(248, 247, 255)
  doc.roundedRect(14, y, 182, notice.inspection_date ? 28 : 20, 3, 3, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(80, 80, 80)
  doc.text('SITE ADDRESS', 20, y + 7)
  doc.text('INSPECTOR', 110, y + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text(notice.site_address, 20, y + 14)
  doc.text(notice.inspector_name ?? '—', 110, y + 14)
  if (notice.inspection_date) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 80, 80)
    doc.text('DATE OF INSPECTION', 20, y + 21)
    doc.text('STAGE', 110, y + 21)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.text(new Date(notice.inspection_date + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }), 20, y + 27)
    doc.text(STAGE_LABEL[notice.stage ?? ''] ?? '—', 110, y + 27)
    y += 36
  } else {
    y += 28
  }
  y += 6

  // Non-compliance details
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('NON-COMPLIANCE DETAILS', 14, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const detailLines = doc.splitTextToSize(notice.non_compliance_details, 182) as string[]
  doc.text(detailLines, 14, y)
  y += detailLines.length * 5 + 8

  // Corrective actions
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('REQUIRED CORRECTIVE ACTIONS', 14, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const actionLines = doc.splitTextToSize(notice.corrective_actions, 182) as string[]
  doc.text(actionLines, 14, y)
  y += actionLines.length * 5 + 8

  // Deadline
  if (notice.remedy_deadline) {
    doc.setFillColor(254, 242, 242)
    doc.roundedRect(14, y, 182, 14, 3, 3, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(185, 28, 28)
    doc.text(`REMEDY DEADLINE: ${new Date(notice.remedy_deadline + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}`, 105, y + 9, { align: 'center' })
    doc.setTextColor(0, 0, 0)
    y += 22
  }

  // Fetch signatures if available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const ownerSigUrl = notice.owner_signature_path
    ? `${supabaseUrl}/storage/v1/object/public/notice-files/${notice.owner_signature_path}`
    : null
  const inspectorSigUrl = notice.inspector_signature_path
    ? `${supabaseUrl}/storage/v1/object/public/notice-files/${notice.inspector_signature_path}`
    : null
  const [ownerSigData, inspectorSigData] = await Promise.all([
    ownerSigUrl ? fetchImageDataUrl(ownerSigUrl) : Promise.resolve(null),
    inspectorSigUrl ? fetchImageDataUrl(inspectorSigUrl) : Promise.resolve(null),
  ])

  // Signature section
  y += 6
  doc.setDrawColor(220, 220, 220)
  doc.line(14, y, 196, y)
  y += 8

  // Owner signature box
  doc.setFillColor(250, 250, 250)
  doc.roundedRect(14, y, 85, 32, 2, 2, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('PROPERTY OWNER / REPRESENTATIVE', 56, y + 6, { align: 'center' })
  if (ownerSigData) {
    doc.addImage(ownerSigData, 'PNG', 16, y + 8, 81, 16)
  }
  doc.setDrawColor(160, 160, 160)
  doc.line(18, y + 26, 96, y + 26)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(140, 140, 140)
  doc.text('Signature', 18, y + 30)
  doc.text(`Date: ${new Date().toLocaleDateString('en-ZA')}`, 70, y + 30, { align: 'right' })

  // Inspector signature box
  doc.setFillColor(250, 250, 250)
  doc.roundedRect(111, y, 85, 32, 2, 2, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('BUILDING INSPECTOR', 153, y + 6, { align: 'center' })
  if (inspectorSigData) {
    doc.addImage(inspectorSigData, 'PNG', 113, y + 8, 81, 16)
  }
  doc.setDrawColor(160, 160, 160)
  doc.line(115, y + 26, 193, y + 26)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(140, 140, 140)
  doc.text('Signature', 115, y + 30)
  doc.text('Municipality of Excellence', 193, y + 30, { align: 'right' })
  doc.setTextColor(0, 0, 0)
  y += 40

  // Attachments list
  const photos = attachments.filter(a => a.file_type === 'photo')
  const documents = attachments.filter(a => a.file_type === 'document')
  if (attachments.length > 0) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 80, 80)
    doc.text('ATTACHMENTS', 14, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(60, 60, 60)
    if (photos.length > 0) doc.text(`Photos (${photos.length}): ${photos.map(p => p.file_name).join(', ')}`, 14, y, { maxWidth: 182 }), y += 5
    if (documents.length > 0) doc.text(`Documents (${documents.length}): ${documents.map(d => d.file_name).join(', ')}`, 14, y, { maxWidth: 182 }), y += 5
    doc.setTextColor(0, 0, 0)
  }

  // Page number
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text(`Generated ${new Date().toLocaleString('en-ZA')} · Ref: ${notice.reference_number}`, 105, 292, { align: 'center' })

  doc.save(`notice-${notice.reference_number}.pdf`)
}

export async function generateNoticesReport(
  notices: Notice[],
  dateFrom: string,
  dateTo: string,
  statusFilter: string
) {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const statusLabel = statusFilter ? ` · ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}` : ''
  const subtitle = `${dateFrom} – ${dateTo}${statusLabel}`

  header(doc, 'Notices Report', subtitle)

  const draft = notices.filter(n => n.status === 'draft').length
  const sent = notices.filter(n => n.status === 'sent').length
  const resolved = notices.filter(n => n.status === 'resolved').length

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text(`Total: ${notices.length}   Draft: ${draft}   Sent: ${sent}   Resolved: ${resolved}`, 14, 36)
  doc.setTextColor(0, 0, 0)

  const STATUS_COLOR: Record<NoticeStatus, [number, number, number]> = {
    draft: [107, 114, 128],
    sent: [59, 130, 246],
    resolved: [34, 197, 94],
  }

  autoTable(doc, {
    startY: 41,
    head: [['Reference', 'Address', 'Owner', 'Inspector', 'Stage', 'Status', 'Deadline']],
    body: notices.map(n => [
      n.reference_number,
      n.site_address,
      n.property_owner_name ?? '—',
      n.inspector_name ?? '—',
      STAGE_LABEL[n.stage ?? ''] ?? '—',
      n.status.charAt(0).toUpperCase() + n.status.slice(1),
      n.remedy_deadline
        ? new Date(n.remedy_deadline + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—',
    ]),
    headStyles: { fillColor: [26, 23, 69], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: [30, 30, 30] },
    alternateRowStyles: { fillColor: [248, 247, 255] },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 40 },
      2: { cellWidth: 28 },
      3: { cellWidth: 28 },
      4: { cellWidth: 26 },
      5: { cellWidth: 18 },
      6: { cellWidth: 22 },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didDrawCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 5) {
        const status = String((data.row.raw as string[])[5]).toLowerCase() as NoticeStatus
        const rgb = STATUS_COLOR[status]
        if (rgb) data.cell.styles.textColor = rgb
      }
    },
    margin: { left: 14, right: 14 },
  })

  footer(doc)
  doc.save(`notices-report-${dateFrom}-${dateTo}.pdf`)
}
