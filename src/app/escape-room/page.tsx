"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * escape room feature:
 * - 4 main stages (format code, click image, generate numbers, CSV->JSON)
 * - manual timer
 * - generate output button shows combined HTML/JS in textarea
 * - save button calls /api/escape/save (stub)
 */

type Stage = {
  id: number;
  title: string;
  hint?: string;
  completed: boolean;
};

export default function EscapeRoom() {
  const [stages, setStages] = useState<Stage[]>([
    { id: 1, title: "Format the code snippet", hint: "Press Format to auto-format", completed: false },
    { id: 2, title: "Click the file icon to reveal a clue", hint: "Click the image", completed: false },
    { id: 3, title: "Generate numbers 0 → 1000", hint: "Click Generate", completed: false },
    { id: 4, title: "Convert CSV to JSON", hint: "Paste CSV and press Convert", completed: false },
  ]);

  const [current, setCurrent] = useState<number>(1);

  // for timer state
  const [minutesInput, setMinutesInput] = useState<number>(5);
  const [secondsLeft, setSecondsLeft] = useState<number>(minutesInput * 60);
  const [running, setRunning] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);

  // state for stage
  const [codeRaw, setCodeRaw] = useState<string>("function hello(){console.log('hi');}"); // messy-ish initial
  const [imageRevealed, setImageRevealed] = useState<boolean>(false);
  const [generatedNumbersPreview, setGeneratedNumbersPreview] = useState<string>("");
  const [csvInput, setCsvInput] = useState<string>("id,name\n1,Alice\n2,Bob");
  const [jsonOutput, setJsonOutput] = useState<string>("");

  const [generatedHtml, setGeneratedHtml] = useState<string>("");

  useEffect(() => {
    if (!running) {
      setSecondsLeft(minutesInput * 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minutesInput]);

  useEffect(() => {
    if (running) {
      timerRef.current = window.setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            window.clearInterval(timerRef.current ?? undefined);
            setRunning(false);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [running]);

  const formatCode = () => {
    try {
      const formatted = codeRaw
        .replace(/\s+/g, " ")
        .replace(/\{ /g, "{\n  ")
        .replace(/; /g, ";\n  ")
        .replace(/\} /g, "}\n")
        .replace(/\n\s+/g, "\n  ");
      setCodeRaw(formatted.trim());
      markStageComplete(1);
    } catch (e) {
      // fallback
      setCodeRaw(codeRaw);
    }
  };

  const clickImage = () => {
    setImageRevealed(true);
    markStageComplete(2);
  };

  const generateNumbers = () => {
    // small preview for UI 
    const arr = Array.from({ length: 1001 }, (_, i) => i);
    setGeneratedNumbersPreview(`${arr.slice(0, 30).join(", ")} ... ${arr.length - 30} more`);
    markStageComplete(3);
  };

  const convertCsv = () => {
    // CSV to JSON conversion
    try {
      const lines = csvInput.trim().split("\n");
      const headers = lines[0].split(",").map((h) => h.trim());
      const rows = lines.slice(1);
      const json = rows.map((r) => {
        const cells = r.split(",");
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          obj[h] = (cells[i] ?? "").trim();
        });
        return obj;
      });
      const pretty = JSON.stringify(json, null, 2);
      setJsonOutput(pretty);
      markStageComplete(4);
    } catch (e) {
      setJsonOutput("Error parsing CSV");
    }
  };

  function markStageComplete(id: number) {
    setStages((s) => s.map((st) => (st.id === id ? { ...st, completed: true } : st)));
    // auto advance to next stage if exists
    setCurrent((c) => Math.min(stages.length, Math.max(c, id + 1)));
  }

  const allComplete = stages.every((s) => s.completed);

  const formatTime = (s: number) => {
    const mm = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const resetTimer = () => {
    setRunning(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
    setSecondsLeft(minutesInput * 60);
  };

  const buildHtmlOutput = () => {
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Escape Room Output</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; padding: 20px; }
    .clue { background:#f5f5f5; padding:8px; border-radius:6px; margin:6px 0; }
  </style>
</head>
<body>
  <h1>Escape Room Results</h1>
  <div class="clue"><strong>Formatted code:</strong><pre>${escapeHtml(codeRaw)}</pre></div>
  <div class="clue"><strong>Image clue revealed:</strong> ${imageRevealed ? "Yes" : "No"}</div>
  <div class="clue"><strong>Numbers preview:</strong><pre>${escapeHtml(generatedNumbersPreview)}</pre></div>
  <div class="clue"><strong>CSV → JSON:</strong><pre>${escapeHtml(jsonOutput)}</pre></div>
</body>
</html>`;
    setGeneratedHtml(html);
  };

  function escapeHtml(s: string) {
    return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  const saveOutput = async () => {
    try {
      const res = await fetch("/api/escape/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: generatedHtml }),
      });
      if (!res.ok) {
        alert("Save failed");
        return;
      }
      const data = await res.json();
      alert(data.message || "Saved!");
    } catch (e) {
      alert("Save error");
    }
  };

  const renderStage = (id: number) => {
    switch (id) {
      case 1:
        return (
          <section aria-labelledby="stage1">
            <h3 id="stage1" className="text-lg font-medium">Stage 1 — Format code</h3>
            <p className="text-sm text-gray-500">{stages[0].hint}</p>
            <textarea
              aria-label="Code to format"
              rows={6}
              className="w-full p-2 border rounded mt-2"
              value={codeRaw}
              onChange={(e) => setCodeRaw(e.target.value)}
            />
            <div className="mt-2 flex gap-2">
              <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={formatCode}>Format</button>
            </div>
          </section>
        );
      case 2:
        return (
          <section aria-labelledby="stage2">
            <h3 id="stage2" className="text-lg font-medium">Stage 2 — Click the clue</h3>
            <p className="text-sm text-gray-500">{stages[1].hint}</p>
            <div className="mt-3">
              <button
                onClick={clickImage}
                aria-pressed={imageRevealed}
                className="p-4 border rounded inline-flex items-center gap-2"
                title="Click to reveal"
              >
                <img src="/file.svg" alt="file icon" width={48} height={48} />
                <span>Click the icon</span>
              </button>
            </div>
            {imageRevealed && <div className="mt-3 p-2 bg-green-50 rounded">Clue revealed! Keep going.</div>}
          </section>
        );
      case 3:
        return (
          <section aria-labelledby="stage3">
            <h3 id="stage3" className="text-lg font-medium">Stage 3 — Generate numbers</h3>
            <p className="text-sm text-gray-500">{stages[2].hint}</p>
            <div className="mt-2 flex gap-2">
              <button className="px-3 py-1 rounded bg-indigo-600 text-white" onClick={generateNumbers}>Generate</button>
            </div>
            {generatedNumbersPreview && <pre className="mt-2 p-2 bg-gray-100 rounded">{generatedNumbersPreview}</pre>}
          </section>
        );
      case 4:
        return (
          <section aria-labelledby="stage4">
            <h3 id="stage4" className="text-lg font-medium">Stage 4 — CSV to JSON</h3>
            <p className="text-sm text-gray-500">{stages[3].hint}</p>
            <textarea
              aria-label="CSV input"
              rows={5}
              className="w-full p-2 border rounded mt-2"
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
            />
            <div className="mt-2 flex gap-2">
              <button className="px-3 py-1 rounded bg-emerald-600 text-white" onClick={convertCsv}>Convert</button>
            </div>
            {jsonOutput && <pre className="mt-2 p-2 bg-gray-100 rounded">{jsonOutput}</pre>}
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Escape Room</h1>

      {/* Timer controls */}
      <section className="mt-4 p-4 border rounded" aria-label="Timer controls">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <span className="text-sm">Minutes:</span>
            <input
              type="number"
              min={1}
              value={minutesInput}
              onChange={(e) => setMinutesInput(Math.max(1, Number(e.target.value || 1)))}
              className="w-20 p-1 border rounded"
              aria-label="Set minutes"
            />
          </label>

          <div className="text-lg font-mono" aria-live="polite">{formatTime(secondsLeft)}</div>

          <div className="ml-auto flex gap-2">
            {!running ? (
              <button className="px-3 py-1 rounded bg-green-600 text-white" onClick={() => setRunning(true)}>Start</button>
            ) : (
              <button className="px-3 py-1 rounded bg-yellow-500 text-black" onClick={() => setRunning(false)}>Pause</button>
            )}
            <button className="px-3 py-1 rounded bg-gray-300" onClick={resetTimer}>Reset</button>
          </div>
        </div>
      </section>

      {/* Stages list + current stage */}
      <section className="mt-4 grid md:grid-cols-3 gap-4">
        <aside className="md:col-span-1 p-3 border rounded">
          <h2 className="font-semibold">Stages</h2>
          <ul className="mt-2 space-y-2">
            {stages.map((s) => (
              <li key={s.id} className={`p-2 rounded ${s.completed ? "bg-green-50" : "bg-white"}`}>
                <button
                  onClick={() => setCurrent(s.id)}
                  className="w-full text-left"
                  aria-current={current === s.id ? "true" : undefined}
                >
                  <div className="flex justify-between">
                    <span>{s.id}. {s.title}</span>
                    <span className="text-sm">{s.completed ? "✔" : "…"} </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="md:col-span-2 p-4 border rounded">
          {renderStage(current)}

          <div className="mt-4 flex gap-2">
            <button
              className="px-3 py-1 rounded bg-blue-600 text-white"
              onClick={() => setCurrent((c) => Math.max(1, c - 1))}
              aria-label="Previous stage"
            >
              Previous
            </button>
            <button
              className="px-3 py-1 rounded bg-blue-600 text-white"
              onClick={() => setCurrent((c) => Math.min(stages.length, c + 1))}
              aria-label="Next stage"
            >
              Next
            </button>

            <div className="ml-auto flex items-center gap-2">
              <button
                className="px-3 py-1 rounded bg-slate-700 text-white"
                onClick={buildHtmlOutput}
              >
                Generate Output
              </button>
              <button
                className="px-3 py-1 rounded bg-rose-600 text-white"
                onClick={saveOutput}
                disabled={!generatedHtml}
                title={!generatedHtml ? "Generate output first" : "Save output"}
              >
                Save
              </button>
            </div>
          </div>

          {allComplete && <div className="mt-4 p-2 bg-green-100 rounded">All stages complete — well done!</div>}

          <div className="mt-4">
            <label className="block text-sm font-medium">Generated HTML (copy/paste into a blank file → Hello.html)</label>
            <textarea
              aria-label="Generated HTML"
              rows={10}
              className="w-full p-2 border rounded mt-2 font-mono text-sm"
              value={generatedHtml}
              onChange={(e) => setGeneratedHtml(e.target.value)}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
