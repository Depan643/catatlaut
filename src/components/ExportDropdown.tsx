import React, { useEffect, useState } from 'react';
import { FileDown, FileText, FileSpreadsheet, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Kapal, Entry, KATEGORI_CUMI, JENIS_IKAN, JENIS_CUMI } from '@/types';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useFishSpecies, FishSpecies } from '@/hooks/useFishSpecies';

const MAX_ENTRIES_PER_COLUMN = 10;

const createOrderMap = (jenisList: readonly string[]) => {
  const map = new Map<string, number>();
  jenisList.forEach((item, index) => map.set(item, index));
  return map;
};

const IKAN_ORDER = createOrderMap(JENIS_IKAN);
const CUMI_ORDER = createOrderMap(JENIS_CUMI);

interface ExportDropdownProps {
  kapal: Kapal;
}

const getCumiCategory = (jenis: string): string => {
  if (KATEGORI_CUMI.sotongSemampar.includes(jenis as any)) return 'Sotong/Semampar';
  if (KATEGORI_CUMI.gurita.includes(jenis as any)) return 'Gurita';
  return 'Cumi';
};

const groupEntriesByJenis = (entries: Entry[]) => {
  const grouped: Record<string, number[]> = {};
  entries.forEach((entry) => {
    if (!grouped[entry.jenis]) grouped[entry.jenis] = [];
    grouped[entry.jenis].push(entry.berat);
  });
  return grouped;
};

const calculateSummary = (entries: Entry[], jenisPendataan: 'ikan' | 'cumi') => {
  const grouped = groupEntriesByJenis(entries);
  const orderMap = jenisPendataan === 'ikan' ? IKAN_ORDER : CUMI_ORDER;
  const summaryRows: Array<{ jenis: string; jumlah: number; total: number; kategori?: string }> = [];

  Object.entries(grouped).forEach(([jenis, beratList]) => {
    summaryRows.push({
      jenis, jumlah: beratList.length,
      total: beratList.reduce((a, b) => a + b, 0),
      kategori: jenisPendataan === 'cumi' ? getCumiCategory(jenis) : undefined,
    });
  });

  summaryRows.sort((a, b) => {
    const orderA = orderMap.get(a.jenis) ?? 999;
    const orderB = orderMap.get(b.jenis) ?? 999;
    return orderA - orderB;
  });

  return summaryRows;
};

interface GroupedEntryForPdf {
  jenis: string;
  beratList: number[];
  columns: number[][];
}

const groupEntriesForTable = (entries: Entry[], jenisPendataan: 'ikan' | 'cumi'): GroupedEntryForPdf[] => {
  const groups: Record<string, number[]> = {};
  entries.forEach((entry) => {
    if (!groups[entry.jenis]) groups[entry.jenis] = [];
    groups[entry.jenis].push(entry.berat);
  });

  const orderMap = jenisPendataan === 'ikan' ? IKAN_ORDER : CUMI_ORDER;

  const sorted = Object.entries(groups)
    .map(([jenis, beratList]): GroupedEntryForPdf => {
      const columns: number[][] = [];
      for (let i = 0; i < beratList.length; i += MAX_ENTRIES_PER_COLUMN) {
        columns.push(beratList.slice(i, i + MAX_ENTRIES_PER_COLUMN));
      }
      return { jenis, beratList, columns };
    })
    .sort((a, b) => {
      const orderA = orderMap.get(a.jenis) ?? 999;
      const orderB = orderMap.get(b.jenis) ?? 999;
      return orderA - orderB;
    });

  return sorted;
};

export const ExportDropdown: React.FC<ExportDropdownProps> = ({ kapal }) => {
  const { user } = useAuth();
  const { species, getSpeciesMap } = useFishSpecies();
  const [profileData, setProfileData] = useState<{ display_name: string; location: string; phone: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('display_name, location, phone').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) setProfileData(data as any);
    });
  }, [user]);

  const handleExportPdf = () => {
    const doc = new jsPDF('portrait');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    const formatTandaSelar = () =>
      `GT.${kapal.tandaSelar.gt} No.${kapal.tandaSelar.no}/${kapal.tandaSelar.huruf}`;

    // ============ HEADER ============
    doc.setDrawColor(30, 64, 175);
    doc.setLineWidth(2);
    doc.line(margin, 10, pageWidth - margin, 10);

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text('LAPORAN PENDATAAN BONGKAR', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(`${kapal.namaKapal} - ${kapal.jenisPendataan === 'ikan' ? 'Ikan' : 'Cumi'}`, pageWidth / 2, 27, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(margin, 31, pageWidth - margin, 31);

    // ============ INFO BOX ============
    let yPos = 38;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, yPos - 3, pageWidth - margin * 2, profileData ? 25 : 18, 3, 3, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);

    const col1 = margin + 5;
    const col2 = 75;
    const col3 = 140;

    doc.setFont('helvetica', 'bold');
    doc.text('Tanda Selar:', col1, yPos + 3);
    doc.setFont('helvetica', 'normal');
    doc.text(formatTandaSelar(), col1 + 25, yPos + 3);

    doc.setFont('helvetica', 'bold');
    doc.text('Tanggal:', col2, yPos + 3);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(kapal.tanggal), 'dd MMMM yyyy', { locale: idLocale }), col2 + 18, yPos + 3);

    doc.setFont('helvetica', 'bold');
    doc.text('Status PIPP:', col3, yPos + 3);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(kapal.donePIPP ? 34 : 156, kapal.donePIPP ? 139 : 163, kapal.donePIPP ? 34 : 175);
    doc.text(kapal.donePIPP ? 'Selesai ✓' : 'Belum', col3 + 25, yPos + 3);
    doc.setTextColor(71, 85, 105);

    if (kapal.mulaiBongkar || kapal.selesaiBongkar) {
      doc.setFont('helvetica', 'bold');
      doc.text('Waktu Bongkar:', col1, yPos + 10);
      doc.setFont('helvetica', 'normal');
      let timeStr = '';
      if (kapal.mulaiBongkar) timeStr = format(new Date(kapal.mulaiBongkar), 'HH:mm', { locale: idLocale });
      if (kapal.selesaiBongkar) timeStr += ` - ${format(new Date(kapal.selesaiBongkar), 'HH:mm', { locale: idLocale })}`;
      doc.text(timeStr, col1 + 32, yPos + 10);
    }

    doc.setFont('helvetica', 'bold');
    doc.text('Alat Tangkap:', col2, yPos + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(kapal.alatTangkap || '-', col2 + 28, yPos + 10);

    doc.setFont('helvetica', 'bold');
    doc.text('Pos. Dermaga:', col3, yPos + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(kapal.posisiDermaga || '-', col3 + 28, yPos + 10);

    if (profileData) {
      doc.setFont('helvetica', 'bold');
      doc.text('Petugas:', col1, yPos + 17);
      doc.setFont('helvetica', 'normal');
      doc.text(profileData.display_name || '-', col1 + 18, yPos + 17);

      doc.setFont('helvetica', 'bold');
      doc.text('Lokasi:', col2, yPos + 17);
      doc.setFont('helvetica', 'normal');
      doc.text(profileData.location || '-', col2 + 15, yPos + 17);

      doc.setFont('helvetica', 'bold');
      doc.text('Telepon:', col3, yPos + 17);
      doc.setFont('helvetica', 'normal');
      doc.text(profileData.phone || '-', col3 + 18, yPos + 17);
    }

    yPos += profileData ? 29 : 22;

    // ============ DETAIL TABLE ============
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text('DETAIL ENTRI', margin, yPos);
    yPos += 5;

    const groupedEntries = groupEntriesForTable(kapal.entries, kapal.jenisPendataan);

    if (groupedEntries.length > 0) {
      const MAX_COLS_PER_ROW = 6;
      
      const chunks: typeof groupedEntries[] = [];
      for (let i = 0; i < groupedEntries.length; i += MAX_COLS_PER_ROW) {
        chunks.push(groupedEntries.slice(i, i + MAX_COLS_PER_ROW));
      }

      chunks.forEach((chunk, chunkIdx) => {
        if (chunkIdx > 0) {
          yPos += 4;
          if (yPos > pageHeight - 60) { doc.addPage(); yPos = 20; }
        }

        const totalColumns = chunk.reduce((sum, g) => sum + g.columns.length, 0);
        const availableWidth = pageWidth - margin * 2;
        const colWidth = availableWidth / totalColumns;

        const columnSpans: { startCol: number; endCol: number; text: string; total: number }[] = [];
        let currentCol = 0;
        chunk.forEach((group) => {
          const startCol = currentCol;
          currentCol += group.columns.length;
          const endCol = currentCol - 1;
          const total = group.beratList.reduce((a, b) => a + b, 0);
          columnSpans.push({ startCol, endCol, text: group.jenis, total });
        });

        const headerHeight = 14;
        const totalHeaderHeight = 10;
        const tableStartX = margin;

        // Draw headers with wrap text
        columnSpans.forEach((span) => {
          const x = tableStartX + span.startCol * colWidth;
          const w = (span.endCol - span.startCol + 1) * colWidth;
          doc.setFillColor(30, 64, 175);
          doc.rect(x, yPos, w, headerHeight, 'F');
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.3);
          doc.rect(x, yPos, w, headerHeight, 'S');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          
          // Wrap text for long fish names
          const maxWidth = w - 4;
          const lines = doc.splitTextToSize(span.text, maxWidth);
          const lineHeight = 3.5;
          const textStartY = yPos + (headerHeight - lines.length * lineHeight) / 2 + lineHeight;
          lines.forEach((line: string, lineIdx: number) => {
            doc.text(line, x + w / 2, textStartY + lineIdx * lineHeight, { align: 'center' });
          });
        });

        const totalY = yPos + headerHeight;
        columnSpans.forEach((span) => {
          const x = tableStartX + span.startCol * colWidth;
          const w = (span.endCol - span.startCol + 1) * colWidth;
          doc.setFillColor(37, 78, 195);
          doc.rect(x, totalY, w, totalHeaderHeight, 'F');
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.3);
          doc.rect(x, totalY, w, totalHeaderHeight, 'S');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6);
          doc.text(`${span.total.toLocaleString('id-ID')} kg`, x + w / 2, totalY + totalHeaderHeight / 2 + 1.5, { align: 'center' });
        });

        const bodyStartY = totalY + totalHeaderHeight;

        const dataRows: string[][] = [];
        for (let rowIdx = 0; rowIdx < MAX_ENTRIES_PER_COLUMN; rowIdx++) {
          const row: string[] = [];
          chunk.forEach((group) => {
            group.columns.forEach((column) => {
              row.push(rowIdx < column.length ? column[rowIdx].toLocaleString('id-ID') : '');
            });
          });
          if (row.some(cell => cell !== '')) dataRows.push(row);
        }

        autoTable(doc, {
          startY: bodyStartY,
          body: dataRows,
          theme: 'grid',
          styles: { fontSize: 7, cellPadding: 1.5, halign: 'center', valign: 'middle', lineColor: [200, 200, 200], lineWidth: 0.3 },
          tableWidth: availableWidth,
          margin: { left: margin, right: margin },
          columnStyles: Object.fromEntries(Array.from({ length: totalColumns }, (_, i) => [i, { cellWidth: colWidth }])),
          alternateRowStyles: { fillColor: [248, 250, 255] },
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;
      });
    }

    // ============ SUMMARY TABLE ============
    if (yPos > pageHeight - 50) { doc.addPage(); yPos = 20; }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text('RINGKASAN', margin, yPos);
    yPos += 5;

    const summary = calculateSummary(kapal.entries, kapal.jenisPendataan);
    const summaryHeaders = kapal.jenisPendataan === 'cumi'
      ? ['No', 'Jenis', 'Kategori', 'Jumlah', 'Total (kg)']
      : ['No', 'Jenis', 'Jumlah', 'Total (kg)'];

    const summaryData = summary.map((row, idx) => {
      if (kapal.jenisPendataan === 'cumi') {
        return [(idx + 1).toString(), row.jenis, row.kategori || '', row.jumlah.toString(), row.total.toLocaleString('id-ID')];
      }
      return [(idx + 1).toString(), row.jenis, row.jumlah.toString(), row.total.toLocaleString('id-ID')];
    });

    const grandTotal = summary.reduce((acc, row) => acc + row.total, 0);
    const totalEntries = summary.reduce((acc, row) => acc + row.jumlah, 0);

    if (kapal.jenisPendataan === 'cumi') {
      summaryData.push(['', 'TOTAL', '', totalEntries.toString(), grandTotal.toLocaleString('id-ID')]);
    } else {
      summaryData.push(['', 'TOTAL', totalEntries.toString(), grandTotal.toLocaleString('id-ID')]);
    }

    const summaryAvailWidth = pageWidth - margin * 2;
    autoTable(doc, {
      startY: yPos, head: [summaryHeaders], body: summaryData, theme: 'striped',
      styles: { fontSize: 8, cellPadding: 3 },
      tableWidth: summaryAvailWidth,
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
      didParseCell: (data) => {
        if (data.row.index === summaryData.length - 1 && data.section === 'body') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [220, 235, 255];
          data.cell.styles.textColor = [30, 64, 175];
        }
      },
    });

    // Category summary for cumi
    if (kapal.jenisPendataan === 'cumi') {
      const catY = (doc as any).lastAutoTable.finalY + 8;
      if (catY < pageHeight - 40) {
        const categoryTotals: Record<string, number> = { Cumi: 0, 'Sotong/Semampar': 0, Gurita: 0 };
        summary.forEach((row) => { if (row.kategori) categoryTotals[row.kategori] += row.total; });
        const activeCategories = Object.entries(categoryTotals).filter(([, total]) => total > 0);
        if (activeCategories.length > 0) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 64, 175);
          doc.text('Per Kategori:', margin, catY);
          let xOffset = margin + 30;
          activeCategories.forEach(([kategori, total]) => {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(`${kategori}: `, xOffset, catY);
            doc.setFont('helvetica', 'bold');
            doc.text(`${total.toLocaleString('id-ID')} kg`, xOffset + doc.getTextWidth(`${kategori}: `), catY);
            xOffset += 60;
          });
        }
      }
    }

    // ============ FOOTER ============
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      const footerLeft = profileData
        ? `Petugas: ${profileData.display_name || '-'} | Diekspor: ${format(new Date(), 'dd MMM yyyy HH:mm', { locale: idLocale })}`
        : `Diekspor: ${format(new Date(), 'dd MMM yyyy HH:mm', { locale: idLocale })}`;
      doc.text(footerLeft, margin, pageHeight - 7);
      doc.text(`Halaman ${i} / ${pageCount}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
    }

    const fileName = `Laporan_${kapal.namaKapal.replace(/\s+/g, '_')}_${format(new Date(kapal.tanggal), 'yyyyMMdd')}.pdf`;
    doc.save(fileName);
  };

  const handleExportExcel = () => {
    const groupedEntries = groupEntriesForTable(kapal.entries, kapal.jenisPendataan);
    const summary = calculateSummary(kapal.entries, kapal.jenisPendataan);
    const grandTotal = summary.reduce((acc, row) => acc + row.total, 0);
    const totalEntries = summary.reduce((acc, row) => acc + row.jumlah, 0);

    // Use HTML table exported as .xls so Excel preserves all styling
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<style>
  td { font-family: Calibri, sans-serif; font-size: 11pt; mso-number-format:\\@; }
  .title { background-color:#1E40AF; color:#FFFFFF; font-size:16pt; font-weight:bold; text-align:center; padding:10px; }
  .subtitle { background-color:#2563EB; color:#FFFFFF; font-size:12pt; text-align:center; padding:6px; }
  .info-label { background-color:#EFF6FF; color:#1E40AF; font-weight:bold; padding:6px 10px; border:1px solid #93C5FD; }
  .info-value { background-color:#F8FAFF; padding:6px 10px; border:1px solid #E2E8F0; }
  .section-header { background-color:#2563EB; color:#FFFFFF; font-weight:bold; padding:6px 10px; font-size:12pt; }
  .fish-header { background-color:#1E40AF; color:#FFFFFF; font-weight:bold; text-align:center; padding:6px; border:1px solid #93C5FD; white-space:normal; word-wrap:break-word; }
  .fish-total { background-color:#3B82F6; color:#FFFFFF; font-weight:bold; text-align:center; padding:4px; border:1px solid #93C5FD; font-size:10pt; }
  .data-even { background-color:#F0F9FF; text-align:center; padding:4px 6px; border:1px solid #BFDBFE; }
  .data-odd { background-color:#FFFFFF; text-align:center; padding:4px 6px; border:1px solid #BFDBFE; }
  .sum-header { background-color:#1E40AF; color:#FFFFFF; font-weight:bold; text-align:center; padding:6px; border:1px solid #93C5FD; }
  .sum-even { background-color:#F0F9FF; padding:4px 8px; border:1px solid #BFDBFE; }
  .sum-odd { background-color:#FFFFFF; padding:4px 8px; border:1px solid #BFDBFE; }
  .sum-total { background-color:#DBEAFE; color:#1E40AF; font-weight:bold; padding:6px 8px; border:1px solid #93C5FD; }
  .cat-header { background-color:#8B5CF6; color:#FFFFFF; font-weight:bold; padding:6px; border:1px solid #C4B5FD; }
  .cat-cell { background-color:#F5F3FF; padding:4px 8px; border:1px solid #DDD6FE; }
  .footer { font-size:8pt; color:#64748B; padding:4px; }
  .pipp-done { color:#22C55E; font-weight:bold; }
  .pipp-not { color:#EF4444; font-weight:bold; }
</style></head><body><table>`;

    // Title
    html += `<tr><td class="title" colspan="20">LAPORAN PENDATAAN BONGKAR</td></tr>`;
    html += `<tr><td class="subtitle" colspan="20">${kapal.namaKapal} - ${kapal.jenisPendataan === 'ikan' ? 'Ikan' : 'Cumi'}</td></tr>`;
    html += `<tr><td colspan="20"></td></tr>`;

    // Info section
    const infoRows: [string, string][] = [
      ['Nama Kapal', kapal.namaKapal],
      ['Tanda Selar', `GT.${kapal.tandaSelar.gt} No.${kapal.tandaSelar.no}/${kapal.tandaSelar.huruf}`],
      ['Jenis Pendataan', kapal.jenisPendataan === 'ikan' ? 'Ikan' : 'Cumi'],
      ['Tanggal', format(new Date(kapal.tanggal), 'dd MMMM yyyy', { locale: idLocale })],
      ['Alat Tangkap', kapal.alatTangkap || '-'],
      ['Posisi Dermaga', kapal.posisiDermaga || '-'],
      ['Mulai Bongkar', kapal.mulaiBongkar ? format(new Date(kapal.mulaiBongkar), 'HH:mm') : '-'],
      ['Selesai Bongkar', kapal.selesaiBongkar ? format(new Date(kapal.selesaiBongkar), 'HH:mm') : '-'],
    ];
    infoRows.forEach(([label, value]) => {
      html += `<tr><td class="info-label">${label}</td><td class="info-value" colspan="3">${value}</td></tr>`;
    });
    // PIPP status
    html += `<tr><td class="info-label">Status PIPP</td><td class="info-value ${kapal.donePIPP ? 'pipp-done' : 'pipp-not'}" colspan="3">${kapal.donePIPP ? '✓ Selesai' : 'Belum'}</td></tr>`;

    if (profileData) {
      html += `<tr><td class="info-label">Petugas</td><td class="info-value" colspan="3">${profileData.display_name || '-'}</td></tr>`;
      html += `<tr><td class="info-label">Lokasi</td><td class="info-value" colspan="3">${profileData.location || '-'}</td></tr>`;
      html += `<tr><td class="info-label">Telepon</td><td class="info-value" colspan="3">${profileData.phone || '-'}</td></tr>`;
    }

    html += `<tr><td colspan="20"></td></tr>`;

    // Detail section
    const MAX_COLS_EXCEL = 6;
    const excelChunks: typeof groupedEntries[] = [];
    for (let i = 0; i < groupedEntries.length; i += MAX_COLS_EXCEL) {
      excelChunks.push(groupedEntries.slice(i, i + MAX_COLS_EXCEL));
    }

    excelChunks.forEach((chunk, chunkIdx) => {
      const totalColumns = chunk.reduce((s, g) => s + g.columns.length, 0);

      if (chunkIdx === 0) {
        html += `<tr><td class="section-header" colspan="${totalColumns}">DETAIL ENTRI</td></tr>`;
      } else {
        html += `<tr><td colspan="${totalColumns}"></td></tr>`;
      }

      // Jenis headers with wrap text
      html += `<tr>`;
      chunk.forEach((group) => {
        html += `<td class="fish-header" colspan="${group.columns.length}">${group.jenis}</td>`;
      });
      html += `</tr>`;

      // Total row
      html += `<tr>`;
      chunk.forEach((group) => {
        const total = group.beratList.reduce((a, b) => a + b, 0);
        html += `<td class="fish-total" colspan="${group.columns.length}">${total.toLocaleString('id-ID')} kg</td>`;
      });
      html += `</tr>`;

      // Data rows
      for (let rowIdx = 0; rowIdx < MAX_ENTRIES_PER_COLUMN; rowIdx++) {
        const row: string[] = [];
        chunk.forEach((group) => {
          group.columns.forEach((column) => {
            row.push(rowIdx < column.length ? column[rowIdx].toLocaleString('id-ID') : '');
          });
        });
        if (row.some(cell => cell !== '')) {
          const cls = rowIdx % 2 === 0 ? 'data-even' : 'data-odd';
          html += `<tr>`;
          row.forEach(cell => { html += `<td class="${cls}">${cell}</td>`; });
          html += `</tr>`;
        }
      }
    });

    html += `<tr><td colspan="20"></td></tr>`;

    // Ringkasan
    const sumCols = kapal.jenisPendataan === 'cumi' ? 5 : 4;
    html += `<tr><td class="section-header" colspan="${sumCols}">RINGKASAN</td></tr>`;

    if (kapal.jenisPendataan === 'cumi') {
      html += `<tr><td class="sum-header">No</td><td class="sum-header">Jenis</td><td class="sum-header">Kategori</td><td class="sum-header">Jumlah</td><td class="sum-header">Total (kg)</td></tr>`;
    } else {
      html += `<tr><td class="sum-header">No</td><td class="sum-header">Jenis</td><td class="sum-header">Jumlah</td><td class="sum-header">Total (kg)</td></tr>`;
    }

    summary.forEach((row, idx) => {
      const cls = idx % 2 === 0 ? 'sum-even' : 'sum-odd';
      if (kapal.jenisPendataan === 'cumi') {
        html += `<tr><td class="${cls}" style="text-align:center;">${idx + 1}</td><td class="${cls}">${row.jenis}</td><td class="${cls}">${row.kategori || ''}</td><td class="${cls}" style="text-align:center;">${row.jumlah}</td><td class="${cls}" style="text-align:right;font-weight:bold;">${row.total.toLocaleString('id-ID')}</td></tr>`;
      } else {
        html += `<tr><td class="${cls}" style="text-align:center;">${idx + 1}</td><td class="${cls}">${row.jenis}</td><td class="${cls}" style="text-align:center;">${row.jumlah}</td><td class="${cls}" style="text-align:right;font-weight:bold;">${row.total.toLocaleString('id-ID')}</td></tr>`;
      }
    });

    // Total row
    if (kapal.jenisPendataan === 'cumi') {
      html += `<tr><td class="sum-total"></td><td class="sum-total">TOTAL</td><td class="sum-total"></td><td class="sum-total" style="text-align:center;">${totalEntries}</td><td class="sum-total" style="text-align:right;">${grandTotal.toLocaleString('id-ID')}</td></tr>`;
    } else {
      html += `<tr><td class="sum-total"></td><td class="sum-total">TOTAL</td><td class="sum-total" style="text-align:center;">${totalEntries}</td><td class="sum-total" style="text-align:right;">${grandTotal.toLocaleString('id-ID')}</td></tr>`;
    }

    // Category totals for cumi
    if (kapal.jenisPendataan === 'cumi') {
      html += `<tr><td colspan="5"></td></tr>`;
      html += `<tr><td class="section-header" colspan="5" style="background-color:#7C3AED;">TOTAL PER KATEGORI</td></tr>`;
      html += `<tr><td class="cat-header">Kategori</td><td class="cat-header">Total (kg)</td></tr>`;
      const categoryTotals: Record<string, number> = { Cumi: 0, 'Sotong/Semampar': 0, Gurita: 0 };
      summary.forEach((row) => { if (row.kategori) categoryTotals[row.kategori] += row.total; });
      Object.entries(categoryTotals).filter(([, v]) => v > 0).forEach(([cat, total]) => {
        html += `<tr><td class="cat-cell">${cat}</td><td class="cat-cell" style="font-weight:bold;text-align:right;">${total.toLocaleString('id-ID')}</td></tr>`;
      });
    }

    // Footer
    html += `<tr><td colspan="20"></td></tr>`;
    html += `<tr><td class="footer" colspan="20">Diekspor: ${format(new Date(), 'dd MMM yyyy HH:mm', { locale: idLocale })}${profileData ? ` | Petugas: ${profileData.display_name || '-'}` : ''}</td></tr>`;
    html += `</table></body></html>`;

    // Download as .xls (HTML table format that Excel opens with styles)
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_${kapal.namaKapal.replace(/\s+/g, '_')}_${format(new Date(kapal.tanggal), 'yyyyMMdd')}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ======= EXPORT BORANG PDF =======
  const handleExportBorang = () => {
    const doc = new jsPDF('portrait');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const speciesMap = getSpeciesMap();

    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text('Detail Kapal dan Petugas', pageWidth / 2, 16, { align: 'center' });

    // Kapal info
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    let y = 24;
    doc.text(`Kapal: ${kapal.namaKapal}  |  Tanda Selar: GT.${kapal.tandaSelar.gt} No.${kapal.tandaSelar.no}/${kapal.tandaSelar.huruf}  |  Tanggal: ${format(new Date(kapal.tanggal), 'dd/MM/yyyy')}`, margin, y);
    y += 6;
    if (profileData) {
      doc.text(`Petugas: ${profileData.display_name || '-'}  |  Lokasi: ${profileData.location || '-'}`, margin, y);
      y += 6;
    }

    // Get all species for the right category
    const grouped = groupEntriesByJenis(kapal.entries);

    if (kapal.jenisPendataan === 'cumi') {
      // Split into Cumi and Sotong sections
      const cumiJenis = KATEGORI_CUMI.cumi as readonly string[];
      const sotongJenis = [...KATEGORI_CUMI.sotongSemampar] as string[];

      const buildSection = (title: string, jenisList: readonly string[]) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 64, 175);
        doc.text(title, margin, y);
        y += 4;

        const sectionData: string[][] = [];
        jenisList.forEach(j => {
          const entryList = grouped[j];
          const total = entryList ? entryList.reduce((a, b) => a + b, 0) : 0;
          const sp = speciesMap.get(j);
          const hargaStr = sp && sp.harga > 0 ? `Rp${sp.harga.toLocaleString('id-ID')}` : '-';
          sectionData.push([j, sp?.nama_latin || '', hargaStr, total > 0 ? total.toLocaleString('id-ID') : '']);
        });
        const sectionTotal = jenisList.reduce((sum, j) => sum + (grouped[j] ? grouped[j].reduce((a, b) => a + b, 0) : 0), 0);
        sectionData.push(['SUBTOTAL', '', '', sectionTotal > 0 ? sectionTotal.toLocaleString('id-ID') + ' kg' : '']);

        autoTable(doc, {
          startY: y,
          head: [['Jenis', 'Nama Latin', 'Harga', 'Jumlah (kg)']],
          body: sectionData,
          theme: 'grid',
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 55, fontStyle: 'bold' },
            1: { cellWidth: 45, fontStyle: 'italic', textColor: [100, 100, 100] },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 30, halign: 'center', fontStyle: 'bold' },
          },
          margin: { left: margin, right: margin },
          didParseCell: (data) => {
            if (data.row.index === sectionData.length - 1 && data.section === 'body') {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [220, 235, 255];
              data.cell.styles.textColor = [30, 64, 175];
            }
            if (data.section === 'body' && data.row.index < sectionData.length - 1) {
              const jumlah = sectionData[data.row.index][3];
              if (jumlah && jumlah !== '') data.cell.styles.fillColor = [240, 249, 255];
            }
          },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      };

      buildSection('DATA CUMI', cumiJenis);
      if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 20; }
      buildSection('DATA SOTONG', sotongJenis);

      // Grand total
      const grandTotal = kapal.entries.reduce((s, e) => s + e.berat, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 64, 175);
      doc.text(`GRAND TOTAL: ${grandTotal.toLocaleString('id-ID')} kg`, margin, y);
    } else {
      // Ikan - original behavior
      const allSpecies = species.filter(s => s.kategori === 'ikan');
      const targetSpecies = allSpecies.length > 0 ? allSpecies : species;
      
      const borangData: string[][] = targetSpecies.map(sp => {
        const entryList = grouped[sp.nama_ikan];
        const total = entryList ? entryList.reduce((a, b) => a + b, 0) : 0;
        const hargaStr = sp.harga > 0 ? `Rp${sp.harga.toLocaleString('id-ID')}` : '-';
        return [sp.nama_ikan, sp.nama_latin || '', hargaStr, total > 0 ? total.toLocaleString('id-ID') : ''];
      });

      Object.keys(grouped).forEach(jenis => {
        if (!targetSpecies.find(s => s.nama_ikan === jenis)) {
          const total = grouped[jenis].reduce((a, b) => a + b, 0);
          const sp = speciesMap.get(jenis);
          borangData.push([jenis, sp?.nama_latin || '', sp?.harga ? `Rp${sp.harga.toLocaleString('id-ID')}` : '-', total.toLocaleString('id-ID')]);
        }
      });

      const grandTotal = kapal.entries.reduce((s, e) => s + e.berat, 0);
      borangData.push(['TOTAL', '', '', grandTotal > 0 ? grandTotal.toLocaleString('id-ID') + ' kg' : '']);

      autoTable(doc, {
        startY: y,
        head: [['Jenis Ikan', 'Nama Latin', 'Harga', 'Jumlah (kg)']],
        body: borangData,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 55, fontStyle: 'bold' },
          1: { cellWidth: 45, fontStyle: 'italic', textColor: [100, 100, 100] },
          2: { cellWidth: 30, halign: 'right' },
          3: { cellWidth: 30, halign: 'center', fontStyle: 'bold' },
        },
        margin: { left: margin, right: margin },
        didParseCell: (data) => {
          if (data.row.index === borangData.length - 1 && data.section === 'body') {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [220, 235, 255];
            data.cell.styles.textColor = [30, 64, 175];
          }
          if (data.section === 'body' && data.row.index < borangData.length - 1) {
            const jumlah = borangData[data.row.index][3];
            if (jumlah && jumlah !== '') data.cell.styles.fillColor = [240, 249, 255];
          }
        },
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const ph = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(`Diekspor: ${format(new Date(), 'dd MMM yyyy HH:mm', { locale: idLocale })}`, margin, ph - 7);
      doc.text(`Halaman ${i}/${pageCount}`, pageWidth - margin, ph - 7, { align: 'right' });
    }

    doc.save(`Borang_${kapal.namaKapal.replace(/\s+/g, '_')}_${format(new Date(kapal.tanggal), 'yyyyMMdd')}.pdf`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon"
          className="text-primary-foreground hover:bg-primary-foreground/10 h-9 w-9"
          disabled={kapal.entries.length === 0}>
          <FileDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={handleExportBorang} className="gap-2 cursor-pointer">
          <ClipboardList className="w-4 h-4" /> Export Borang PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportPdf} className="gap-2 cursor-pointer">
          <FileText className="w-4 h-4" /> Export Laporan PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="w-4 h-4" /> Export Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
