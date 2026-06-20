import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

import {
  infiniteLogoBytes,
  INFINITE_LOGO_HEIGHT,
  INFINITE_LOGO_WIDTH,
} from "../branding/logo";
import { buildBodyRows, buildClaimsRows, type LabeledRow } from "../report-view";
import type { FacilityReport, ManualInputs } from "../types";

const BRAND = "0F2A4A";
const ACCENT = "1F6FEB";
const LOGO_WIDTH = 200;
const LOGO_HEIGHT = Math.round((LOGO_WIDTH * INFINITE_LOGO_HEIGHT) / INFINITE_LOGO_WIDTH);

// Letter page (12240 twips) minus 1" margins each side = 9360 twips of content.
// Fixed DXA column widths + fixed layout render consistently in Word, Pages, and
// Google Docs; percentage widths collapse in non-Word renderers.
const CONTENT_WIDTH_DXA = 9360;
const LABEL_WIDTH_DXA = 5800;
const VALUE_WIDTH_DXA = CONTENT_WIDTH_DXA - LABEL_WIDTH_DXA;

function dataTable(rows: LabeledRow[]): Table {
  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: [LABEL_WIDTH_DXA, VALUE_WIDTH_DXA],
    layout: TableLayoutType.FIXED,
    rows: rows.map(
      (row) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: LABEL_WIDTH_DXA, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: row.label, bold: true })] })],
            }),
            new TableCell({
              width: { size: VALUE_WIDTH_DXA, type: WidthType.DXA },
              children: [new Paragraph(row.value)],
            }),
          ],
        }),
    ),
  });
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, color: BRAND, size: 24 })],
  });
}

const LOGO_WIDTH_DXA = LOGO_WIDTH * 15; // 200px at 96 dpi → 3000 twips
const LOGO_SIDE_DXA = Math.floor((CONTENT_WIDTH_DXA - LOGO_WIDTH_DXA) / 2);

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

const BORDERLESS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER,
};

/**
 * Three-column spacer table: empty side cells + fixed-width center column for the
 * logo. Non-Word renderers (Pages, Google Docs) ignore paragraph/cell center
 * alignment on inline images, but honor fixed column geometry.
 */
function centeredLogoBlock(): Table {
  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: [LOGO_SIDE_DXA, LOGO_WIDTH_DXA, LOGO_SIDE_DXA],
    layout: TableLayoutType.FIXED,
    borders: BORDERLESS,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: LOGO_SIDE_DXA, type: WidthType.DXA },
            borders: BORDERLESS,
            children: [new Paragraph("")],
          }),
          new TableCell({
            width: { size: LOGO_WIDTH_DXA, type: WidthType.DXA },
            borders: BORDERLESS,
            children: [
              new Paragraph({
                children: [
                  new ImageRun({
                    type: "png",
                    data: infiniteLogoBytes(),
                    transformation: { width: LOGO_WIDTH, height: LOGO_HEIGHT },
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: LOGO_SIDE_DXA, type: WidthType.DXA },
            borders: BORDERLESS,
            children: [new Paragraph("")],
          }),
        ],
      }),
    ],
  });
}

/** Mirrors the PDF snapshot content/branding using the shared view model. */
export function buildSnapshotDoc(report: FacilityReport, manual: ManualInputs): Document {
  const state = report.state ?? "";

  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: [
          centeredLogoBlock(),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 120 },
            children: [new TextRun({ text: "FACILITY ASSESSMENT SNAPSHOT", bold: true })],
          }),
          ...(state
            ? [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: state, bold: true, color: ACCENT, size: 22 })],
                }),
              ]
            : []),

          sectionHeading("Facility Overview"),
          dataTable(buildBodyRows(report, manual)),

          sectionHeading("Hospitalization & ED Metrics"),
          dataTable(buildClaimsRows(report)),

          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { before: 240 },
            children: [
              new ExternalHyperlink({
                link: report.careCompareUrl,
                children: [
                  new TextRun({
                    text: "View on Medicare.gov",
                    bold: true,
                    size: 22,
                    color: ACCENT,
                    underline: {},
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: report.careCompareUrl, color: "57606A", size: 16 })],
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 360 },
            children: [
              new TextRun({
                text: "INFINITE — Managed by MEDELITE · Data sourced from CMS Provider Data Catalog",
                color: "57606A",
                size: 14,
              }),
            ],
          }),
        ],
      },
    ],
  });
}

export async function snapshotDocxBlob(
  report: FacilityReport,
  manual: ManualInputs,
): Promise<Blob> {
  return Packer.toBlob(buildSnapshotDoc(report, manual));
}
