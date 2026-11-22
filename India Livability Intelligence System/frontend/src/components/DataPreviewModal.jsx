import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Download,
  Copy,
  Check,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FileText,
  Table as TableIcon,
  Loader2,
  AlertCircle
} from "lucide-react";
import Modal from "./Modal";

/**
 * Robust lightweight CSV parser that respects quoted commas and newlines.
 */
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return { headers: [], rows: [] };

  const parseLine = line => {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseLine(lines[i]);
    const rowObj = {};
    headers.forEach((header, colIdx) => {
      rowObj[header] = values[colIdx] ?? "";
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

export default function DataPreviewModal({ fileUrl, fileName, onClose }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc"); // "asc" | "desc"
  const [copied, setCopied] = useState(false);

  const isMarkdown = Boolean(fileName?.toLowerCase().endsWith(".md") || fileUrl?.toLowerCase().endsWith(".md"));

  // Fetch file content
  useEffect(() => {
    if (!fileUrl) return;
    let isCancelled = false;

    fetch(fileUrl)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load ${fileName}`);
        return res.text();
      })
      .then(text => {
        if (!isCancelled) {
          setContent(text);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!isCancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [fileUrl, fileName]);

  // Parse CSV
  const { headers, rows } = useMemo(() => {
    if (isMarkdown || !content) return { headers: [], rows: [] };
    return parseCSV(content);
  }, [content, isMarkdown]);

  // Filter rows by search
  const filteredRows = useMemo(() => {
    if (!rows.length) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter(row =>
      Object.values(row).some(val => String(val).toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  // Sort rows
  const sortedRows = useMemo(() => {
    if (!sortColumn) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];
      const numA = Number(valA);
      const numB = Number(valB);

      if (Number.isFinite(numA) && Number.isFinite(numB)) {
        return sortDirection === "asc" ? numA - numB : numB - numA;
      }
      return sortDirection === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [filteredRows, sortColumn, sortDirection]);

  // Paginated rows
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / rowsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safeCurrentPage - 1) * rowsPerPage;
    return sortedRows.slice(start, start + rowsPerPage);
  }, [sortedRows, safeCurrentPage, rowsPerPage]);

  const handleSort = useCallback(column => {
    setSortColumn(prev => {
      if (prev === column) {
        setSortDirection(d => (d === "asc" ? "desc" : "asc"));
        return column;
      }
      setSortDirection("asc");
      return column;
    });
  }, []);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal onClose={onClose} label={`Data Preview: ${fileName}`} className="max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E5E5] bg-[#FAFAF8] px-5 py-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E5E5E5] bg-white text-[#B51F3B]">
            {isMarkdown ? <FileText size={18} /> : <TableIcon size={18} />}
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-[#111111] truncate">{fileName}</h2>
            <p className="text-xs text-[#666666]">
              {isMarkdown
                ? "Statistical Analysis & Findings Document"
                : `${rows.length.toLocaleString()} records · ${headers.length} columns`}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            disabled={loading || !!error}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-bold text-[#111111] hover:bg-[#FAFAF8] transition-colors disabled:opacity-50"
            title="Copy raw contents to clipboard"
          >
            {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            <span>{copied ? "Copied!" : "Copy Raw"}</span>
          </button>
          <a
            href={fileUrl}
            download={fileName}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#111111] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#333333] transition-colors shadow-xs"
            title="Download file directly"
          >
            <Download size={13} />
            <span>Download</span>
          </a>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-[#888888] hover:bg-[#E5E5E5] hover:text-[#111111] transition-colors"
            aria-label="Close data preview"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 min-h-0 p-5 overflow-hidden">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 size={36} className="text-[#B51F3B] animate-spin mb-3" />
            <p className="text-sm font-bold text-[#111111]">Loading dataset preview...</p>
            <p className="text-xs text-[#777777] mt-1">{fileUrl}</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle size={36} className="text-rose-600 mb-3" />
            <p className="text-sm font-bold text-[#111111]">Could not load file preview</p>
            <p className="text-xs text-[#777777] max-w-md mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && isMarkdown && (
          <div className="custom-scrollbar flex-1 overflow-y-auto max-h-[600px] rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] p-5 font-mono text-xs text-[#333333] leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        )}

        {!loading && !error && !isMarkdown && (
          <div className="flex flex-col flex-1 min-h-0 gap-3">
            {/* Table Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Filter table rows..."
                  className="w-full rounded-xl border border-[#E5E5E5] bg-[#FAFAF8] py-1.5 pl-8 pr-3 text-xs text-[#111111] placeholder:text-[#999999] focus:border-[#111111] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 text-xs text-[#666666]">
                <label className="flex items-center gap-1.5">
                  <span>Rows:</span>
                  <select
                    value={rowsPerPage}
                    onChange={e => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded-lg border border-[#E5E5E5] bg-white px-2 py-1 text-xs font-bold text-[#111111]"
                  >
                    {[10, 15, 25, 50, 100].map(n => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="font-semibold text-[#111111]">
                  Showing {sortedRows.length ? (safeCurrentPage - 1) * rowsPerPage + 1 : 0}–
                  {Math.min(safeCurrentPage * rowsPerPage, sortedRows.length)} of {sortedRows.length}
                </span>
              </div>
            </div>

            {/* Scrollable Table */}
            <div className="custom-scrollbar flex-1 min-h-[360px] max-h-[500px] overflow-auto rounded-xl border border-[#E5E5E5] bg-white shadow-xs">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 bg-[#FAFAF8] border-b border-[#E5E5E5]">
                  <tr>
                    <th className="px-3 py-2 text-[10px] font-bold text-[#888888] uppercase tracking-wider w-10">
                      #
                    </th>
                    {headers.map(header => (
                      <th
                        key={header}
                        onClick={() => handleSort(header)}
                        className="px-3 py-2 text-[11px] font-bold text-[#111111] cursor-pointer hover:bg-[#EBEBE8] transition-colors whitespace-nowrap select-none"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{header}</span>
                          <ArrowUpDown
                            size={11}
                            className={sortColumn === header ? "text-[#B51F3B]" : "text-[#AAAAAA]"}
                          />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBEBE8] text-[#333333]">
                  {paginatedRows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-[#FAFAF8] transition-colors">
                      <td className="px-3 py-2 text-[10px] font-mono text-[#888888]">
                        {(currentPage - 1) * rowsPerPage + rowIdx + 1}
                      </td>
                      {headers.map(header => (
                        <td key={header} className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                          {row[header] !== "" && row[header] !== undefined ? (
                            String(row[header])
                          ) : (
                            <span className="text-[#BBBBBB] italic">null</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {!sortedRows.length && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-[#888888]">
                  <Search size={20} className="text-[#CCCCCC] mb-1" />
                  <span>No rows match the search query</span>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-[#E5E5E5] pt-3 text-xs">
              <span className="text-[#777777]">
                Page {safeCurrentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-semibold text-[#111111] hover:bg-[#FAFAF8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={13} />
                  <span>Previous</span>
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-semibold text-[#111111] hover:bg-[#FAFAF8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
