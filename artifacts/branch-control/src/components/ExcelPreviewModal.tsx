import { X, Download, Table2, Loader2, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export interface ExcelPreviewData {
  company: string;
  period: string;
  periodLabel: string;
  branchFilter: string;
  summary: {
    totalSales: number; totalProfit: number;
    totalCash: number;  totalMomo: number;
    totalBank: number;  totalCredit: number;
    totalItems: number; margin: string | number;
  };
  headers: string[];
  rows: string[][];
  totalsRow: string[];
  lineItemsCount: number;
  lineItemsSheets: boolean;
}

interface Props {
  data: ExcelPreviewData;
  filename: string;
  onDownload: () => void;
  onClose: () => void;
}

function fmt(n: number) {
  return "GHS " + n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ExcelPreviewModal({ data, filename, onDownload, onClose }: Props) {
  const [saving, setSaving] = useState(false);
  const { summary: s } = data;

  function handleDownload() {
    setSaving(true);
    setTimeout(() => { onDownload(); setSaving(false); onClose(); }, 80);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", bounce: 0.15 }}
          onClick={e => e.stopPropagation()}
          className="flex flex-col h-full max-w-6xl w-full mx-auto bg-card shadow-2xl overflow-hidden"
          style={{ marginTop: "3vh", borderRadius: "1.5rem 1.5rem 0 0" }}
        >
          {/* Toolbar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Table2 className="h-4 w-4 text-emerald-700"/>
              </div>
              <div>
                <p className="font-black text-sm text-foreground">Excel Preview</p>
                <p className="text-xs text-muted-foreground">
                  {data.periodLabel} · {data.branchFilter === "All" ? "All Branches" : data.branchFilter} · {data.rows.length} records
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:block">{filename}</span>
              <button
                onClick={handleDownload} disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-[#1d6f42] text-white px-5 py-2.5 text-sm font-black hover:opacity-90 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4"/>}
                Download Excel
              </button>
              <button onClick={onClose} className="rounded-xl bg-muted p-2.5 hover:bg-muted/70 transition-colors">
                <X className="h-4 w-4"/>
              </button>
            </div>
          </div>

          {/* Spreadsheet body */}
          <div className="flex-1 overflow-auto bg-white text-[11px]">

            {/* Green Excel-style toolbar */}
            <div className="bg-[#1d6f42] px-4 py-2 flex items-center gap-3 sticky top-0 z-10">
              <Table2 className="h-4 w-4 text-white/70"/>
              <span className="text-white font-black">{data.company}</span>
              <span className="text-white/50">·</span>
              <span className="text-white/70">{filename}</span>
            </div>

            {/* Sheet tabs */}
            <div className="flex bg-gray-100 border-b border-gray-300 px-3 pt-1.5 gap-1 sticky top-9 z-10">
              <div className="bg-white border border-gray-300 border-b-white rounded-t px-4 py-1 text-[10px] font-black text-[#1d6f42] -mb-px">
                Summary
              </div>
              <div className="bg-gray-50 border border-gray-200 border-b-0 rounded-t px-4 py-1 text-[10px] text-gray-400">
                Sales Entries
              </div>
              {data.lineItemsSheets && (
                <div className="bg-gray-50 border border-gray-200 border-b-0 rounded-t px-4 py-1 text-[10px] text-gray-400 flex items-center gap-1">
                  <Layers className="h-2.5 w-2.5"/>
                  Line Items
                </div>
              )}
            </div>

            {/* Summary KPIs */}
            <div className="grid grid-cols-4 gap-0 border-b border-gray-200 bg-[#e8f5ee]">
              {[
                { label: "TOTAL SALES",  value: fmt(s.totalSales) },
                { label: "NET PROFIT",   value: fmt(s.totalProfit) },
                { label: "CASH",         value: fmt(s.totalCash) },
                { label: "MOMO",         value: fmt(s.totalMomo) },
                { label: "BANK",         value: fmt(s.totalBank) },
                { label: "CREDIT",       value: fmt(s.totalCredit) },
                { label: "ITEMS SOLD",   value: String(s.totalItems) },
                { label: "MARGIN",       value: s.margin + "%" },
              ].map(({ label, value }) => (
                <div key={label} className="px-4 py-3 border-r border-gray-200 last:border-r-0">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
                  <p className="font-black text-[#1d6f42] mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {/* Meta */}
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-[9px] text-gray-400">
              <span>{data.company} · {data.periodLabel} · {data.branchFilter === "All" ? "All Branches" : data.branchFilter} · Generated {new Date().toLocaleDateString("en-GH", { dateStyle: "long" })}</span>
              {data.lineItemsSheets && (
                <span className="flex items-center gap-1 text-[#1d6f42] font-bold">
                  <Layers className="h-3 w-3"/>
                  Line Items sheet included ({data.lineItemsCount} items)
                </span>
              )}
            </div>

            {/* Data table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-max">
                <thead>
                  <tr className="bg-[#1d6f42]">
                    {data.headers.map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[9px] font-black text-white border-r border-white/10 last:border-0 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, i) => (
                    <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-[#f0faf5]/50"} hover:bg-yellow-50/60 transition-colors`}>
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-2 border-r border-gray-100 last:border-0 whitespace-nowrap">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-[#1d6f42]/10 border-t-2 border-[#1d6f42]/30 font-black">
                    {data.totalsRow.map((cell, j) => (
                      <td key={j} className="px-3 py-2 border-r border-gray-200 last:border-0 whitespace-nowrap text-[#1d6f42]">
                        {cell}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer strip */}
            <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex justify-between text-[9px] text-gray-300">
              <span>Generated by BranchControl · ChalePay</span>
              <span>{data.rows.length} records</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
