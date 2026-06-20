import {
  Document,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import {
  INFINITE_LOGO_DATA_URI,
  INFINITE_LOGO_HEIGHT,
  INFINITE_LOGO_WIDTH,
} from "@/lib/branding/logo";
import { buildBodyRows, buildClaimsRows } from "@/lib/report-view";
import type { FacilityReport, ManualInputs } from "@/lib/types";

const LOGO_WIDTH = 180;
const LOGO_HEIGHT = (LOGO_WIDTH * INFINITE_LOGO_HEIGHT) / INFINITE_LOGO_WIDTH;

const COLORS = {
  brand: "#0f2a4a",
  accent: "#1f6feb",
  border: "#d0d7de",
  zebra: "#f3f6fb",
  text: "#1b1f24",
  muted: "#57606a",
};

const styles = StyleSheet.create({
  page: { paddingHorizontal: 40, paddingVertical: 36, fontSize: 10, color: COLORS.text, fontFamily: "Helvetica" },
  brandBar: { alignItems: "center", borderBottomWidth: 2, borderBottomColor: COLORS.brand, paddingBottom: 10, marginBottom: 14 },
  logo: { width: LOGO_WIDTH, height: LOGO_HEIGHT, marginBottom: 8 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 4, textAlign: "center" },
  state: { fontSize: 11, color: COLORS.accent, fontFamily: "Helvetica-Bold", marginTop: 2, textAlign: "center" },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: COLORS.brand, marginTop: 16, marginBottom: 6 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowZebra: { backgroundColor: COLORS.zebra },
  cellLabel: { width: "62%", paddingVertical: 4, paddingHorizontal: 6, fontFamily: "Helvetica-Bold" },
  cellValue: { width: "38%", paddingVertical: 4, paddingHorizontal: 6 },
  linkBlock: { marginTop: 18 },
  link: { color: COLORS.accent, fontFamily: "Helvetica-Bold", fontSize: 11 },
  linkUrl: { color: COLORS.muted, fontSize: 8, marginTop: 2 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 7, color: COLORS.muted, textAlign: "center" },
});

function Table({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <View>
      {rows.map((row, i) => (
        <View key={row.label} style={i % 2 === 1 ? [styles.row, styles.rowZebra] : styles.row}>
          <Text style={styles.cellLabel}>{row.label}</Text>
          <Text style={styles.cellValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

export interface SnapshotProps {
  report: FacilityReport;
  manual: ManualInputs;
}

export function FacilitySnapshotDocument({ report, manual }: SnapshotProps) {
  const bodyRows = buildBodyRows(report, manual);
  const claimsRows = buildClaimsRows(report);
  const state = report.state ?? "";

  return (
    <Document title={`Facility Assessment Snapshot — ${report.ccn}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.brandBar}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image style={styles.logo} src={INFINITE_LOGO_DATA_URI} />
          <Text style={styles.title}>FACILITY ASSESSMENT SNAPSHOT</Text>
          {state ? <Text style={styles.state}>{state}</Text> : null}
        </View>

        <Text style={styles.sectionTitle}>Facility Overview</Text>
        <Table rows={bodyRows} />

        <Text style={styles.sectionTitle}>Hospitalization & ED Metrics</Text>
        <Table rows={claimsRows} />

        <View style={styles.linkBlock}>
          <Link src={report.careCompareUrl} style={styles.link}>
            View on Medicare.gov
          </Link>
          <Text style={styles.linkUrl}>{report.careCompareUrl}</Text>
        </View>

        <Text style={styles.footer} fixed>
          INFINITE — Managed by MEDELITE · Data sourced from CMS Provider Data Catalog
        </Text>
      </Page>
    </Document>
  );
}
