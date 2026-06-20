"use client";

import { useState } from "react";

import { validateCcn } from "@/lib/ccn";
import { buildBodyRows, buildClaimsRows } from "@/lib/report-view";
import { EMPTY_MANUAL_INPUTS, type FacilityReport, type ManualInputs } from "@/lib/types";
import { ComparisonCharts } from "./ComparisonCharts";

type Status = "idle" | "loading" | "ready" | "error";

const MANUAL_FIELDS: { key: keyof ManualInputs; label: string; placeholder: string }[] = [
  { key: "nameOverride", label: "Facility Name Override", placeholder: "Leave blank to use CMS name" },
  { key: "emr", label: "EMR", placeholder: "e.g. PCC" },
  { key: "currentCensus", label: "Current Census", placeholder: "e.g. 112" },
  { key: "typeOfPatient", label: "Type of Patient", placeholder: "e.g. Long-term & Short-term" },
  { key: "previousCoverage", label: "Previous Coverage from Medelite", placeholder: "e.g. Yes" },
  { key: "previousPerformance", label: "Previous Provider Performance", placeholder: "e.g. About 30 patients/day" },
  { key: "medicalCoverage", label: "Medical Coverage", placeholder: "e.g. Optometry, PCP, Podiatry" },
];

export function FacilityReportApp() {
  const [ccnInput, setCcnInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [report, setReport] = useState<FacilityReport | null>(null);
  const [manual, setManual] = useState<ManualInputs>(EMPTY_MANUAL_INPUTS);
  const [exporting, setExporting] = useState<null | "pdf" | "docx">(null);

  async function handleLookup() {
    const { valid, normalized, error } = validateCcn(ccnInput);
    if (!valid) {
      setStatus("error");
      setErrorMessage(error ?? "Invalid CCN");
      setReport(null);
      return;
    }

    setStatus("loading");
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/facility/${normalized}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setStatus("error");
        setErrorMessage(body.error ?? "Lookup failed. Try again.");
        setReport(null);
        return;
      }
      const data = (await res.json()) as FacilityReport;
      setReport(data);
      setStatus("ready");
    } catch {
      setStatus("error");
      setErrorMessage("Unable to reach the server. Try again.");
      setReport(null);
    }
  }

  async function handleExportPdf() {
    if (!report) return;
    setExporting("pdf");
    try {
      const [{ pdf }, { FacilitySnapshotDocument }, { saveAs }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./pdf/FacilitySnapshotDocument"),
        import("file-saver"),
      ]);
      const blob = await pdf(
        <FacilitySnapshotDocument report={report} manual={manual} />,
      ).toBlob();
      saveAs(blob, `facility-assessment-${report.ccn}.pdf`);
    } finally {
      setExporting(null);
    }
  }

  async function handleExportDocx() {
    if (!report) return;
    setExporting("docx");
    try {
      const [{ snapshotDocxBlob }, { saveAs }] = await Promise.all([
        import("@/lib/export/docx"),
        import("file-saver"),
      ]);
      const blob = await snapshotDocxBlob(report, manual);
      saveAs(blob, `facility-assessment-${report.ccn}.docx`);
    } finally {
      setExporting(null);
    }
  }

  const canExport = status === "ready" && report !== null && exporting === null;
  const bodyRows = report ? buildBodyRows(report, manual) : [];
  const claimsRows = report ? buildClaimsRows(report) : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8 flex flex-col items-center border-b-2 border-[#0f2a4a] pb-5 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/infinite.png" alt="INFINITE — Managed by MEDELITE" className="h-12 w-auto" />
        <h1 className="mt-4 text-3xl font-bold text-slate-900">Facility Assessment Report Generator</h1>
        <p className="mt-1 text-sm text-slate-500">
          Look up a nursing home by CCN, enrich with operational notes, and export a branded snapshot.
        </p>
      </header>

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label htmlFor="ccn" className="block text-sm font-semibold text-slate-700">
          CMS Certification Number (CCN)
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id="ccn"
            value={ccnInput}
            onChange={(e) => setCcnInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            placeholder="e.g. 686123"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-[#1f6feb] focus:ring-2 focus:ring-[#1f6feb]/30 sm:max-w-xs"
          />
          <button
            onClick={handleLookup}
            disabled={status === "loading"}
            className="rounded-lg bg-[#1f6feb] px-5 py-2 font-semibold text-white transition hover:bg-[#1a5fd0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? "Looking up…" : "Lookup Facility"}
          </button>
        </div>
        {status === "error" && errorMessage ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
        ) : null}
      </section>

      {report ? (
        <div className="space-y-8">
          {(report.partial.claims || report.partial.stateAverages) && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Some CMS metrics were unavailable and are shown as N/A.
            </p>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-[#0f2a4a]">Facility Overview</h2>
              <dl className="divide-y divide-slate-100">
                {bodyRows.map((row) => (
                  <div key={row.label} className="flex justify-between gap-4 py-2 text-sm">
                    <dt className="font-medium text-slate-600">{row.label}</dt>
                    <dd className="text-right text-slate-900">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-[#0f2a4a]">Operational Inputs</h2>
              <div className="space-y-3">
                {MANUAL_FIELDS.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-slate-500">{field.label}</label>
                    <input
                      value={manual[field.key]}
                      onChange={(e) => setManual((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-[#1f6feb] focus:ring-2 focus:ring-[#1f6feb]/30"
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-[#0f2a4a]">Hospitalization & ED Metrics</h2>
            <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              {claimsRows.map((row) => (
                <div key={row.label} className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm">
                  <dt className="font-medium text-slate-600">{row.label}</dt>
                  <dd className="text-right text-slate-900">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#0f2a4a]">Facility vs. State vs. National</h2>
            <ComparisonCharts report={report} />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#0f2a4a]">Export Snapshot</h2>
                <a
                  href={report.careCompareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#1f6feb] underline"
                >
                  View on Medicare.gov
                </a>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleExportPdf}
                  disabled={!canExport}
                  className="rounded-lg bg-[#0f2a4a] px-4 py-2 font-semibold text-white transition hover:bg-[#0b2038] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {exporting === "pdf" ? "Generating…" : "Download PDF"}
                </button>
                <button
                  onClick={handleExportDocx}
                  disabled={!canExport}
                  className="rounded-lg border border-[#0f2a4a] px-4 py-2 font-semibold text-[#0f2a4a] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {exporting === "docx" ? "Generating…" : "Download Word"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
