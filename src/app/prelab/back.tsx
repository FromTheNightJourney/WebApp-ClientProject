"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";

/**
 * escape-room/page.tsx
 * Single-file Builder + Player (Option A)
 *
 * Paste into: src/app/escape-room/page.tsx
 *
 * Notes:
 * - Uses next/image with unoptimized for data URLs (local dev friendly)
 * - localStorage keys: escape:puzzles:v3, escape:hotspots:v3, escape:settings:v3
 */

/* =======================
   Types
   ======================= */
type PuzzleType = "short" | "mcq";

type Puzzle = {
  id: string;
  type: PuzzleType;
  question: string;
  options: string[]; // for mcq
  correctIndex: number | null;
  expectedAnswer: string; // for short
  imageDataUrl?: string;
};

type Hotspot = {
  id: string;
  puzzleId: string | null;
  xPct: number; // 0..100
  yPct: number; // 0..100
};

type Settings = {
  globalMinutes: number;
  bgImageDataUrl?: string | null;
};

/* =======================
   LocalStorage helpers (easy to swap for API)
   ======================= */
const LS_PUZZLES = "escape:puzzles:v3";
const LS_HOTSPOTS = "escape:hotspots:v3";
const LS_SETTINGS = "escape:settings:v3";

const savePuzzlesLS = (p: Puzzle[]) => localStorage.setItem(LS_PUZZLES, JSON.stringify(p));
const loadPuzzlesLS = (): Puzzle[] => {
  try {
    const r = localStorage.getItem(LS_PUZZLES);
    return r ? JSON.parse(r) : [];
  } catch {
    return [];
  }
};

const saveHotspotsLS = (h: Hotspot[]) => localStorage.setItem(LS_HOTSPOTS, JSON.stringify(h));
const loadHotspotsLS = (): Hotspot[] => {
  try {
    const r = localStorage.getItem(LS_HOTSPOTS);
    return r ? JSON.parse(r) : [];
  } catch {
    return [];
  }
};

const saveSettingsLS = (s: Settings) => localStorage.setItem(LS_SETTINGS, JSON.stringify(s));
const loadSettingsLS = (): Settings => {
  try {
    const r = localStorage.getItem(LS_SETTINGS);
    return r ? JSON.parse(r) : { globalMinutes: 5, bgImageDataUrl: null };
  } catch {
    return { globalMinutes: 5, bgImageDataUrl: null };
  }
};

/* =======================
   Utilities
   ======================= */
const uid = () => Math.random().toString(36).slice(2, 9);
const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));

/* =======================
   Modal (Portal) used in Play
   ======================= */
const PuzzleModal = ({
  puzzle,
  open,
  onClose,
  onSubmit,
}: {
  puzzle: Puzzle | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (answer: string | number) => boolean;
}) => {
  const textRef = useRef("");
  const choiceRef = useRef<number | null>(null);
  const [, force] = useState(0);
  const update = () => force((x) => x + 1);

  if (!puzzle) return null;

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 shadow-2xl transition-all duration-200 ${
          open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
        role="dialog"
      >
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold">Puzzle</h2>
            <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{puzzle.question}</p>
            {puzzle.imageDataUrl && (
              <div className="mt-3 max-h-64 w-full rounded overflow-hidden">
                <Image src={puzzle.imageDataUrl} alt={puzzle.question || "puzzle image"} width={800} height={450} unoptimized className="object-contain w-full h-auto" />
              </div>
            )}
          </div>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="mt-4">
          {puzzle.type === "mcq" ? (
            <div className="space-y-2">
              {puzzle.options.map((opt, idx) => (
                <label key={idx} className="flex items-center gap-2 p-2 border rounded cursor-pointer">
                  <input
                    type="radio"
                    name={`mcq-${puzzle.id}`}
                    checked={choiceRef.current === idx}
                    onChange={() => {
                      choiceRef.current = idx;
                      update();
                    }}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          ) : (
            <input
              defaultValue={textRef.current}
              onChange={(e) => (textRef.current = e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Type your answer..."
            />
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className="border px-3 py-1 rounded" onClick={onClose}>Close</button>
          <button
            className="bg-emerald-600 text-white px-3 py-1 rounded"
            onClick={() => {
              const ok = onSubmit(puzzle.type === "mcq" ? choiceRef.current ?? -1 : textRef.current);
              if (ok) {
                // small feedback, you might want to replace with a nicer UX
                alert("Correct!");
                onClose();
              } else {
                alert("Incorrect — try again.");
              }
            }}
          >
            Submit
          </button>
        </div>
      </div>
    </>,
    document.body
  );
};

/* =======================
   SmallCreateForm used in builder popup to quickly create a puzzle
   ======================= */
function SmallCreateForm({ onCreate }: { onCreate: (p: Omit<Puzzle, "id">) => Promise<void> | void }) {
  const [type, setType] = useState<PuzzleType>("short");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [correctIndex, setCorrectIndex] = useState<number | null>(0);
  const [expectedAnswer, setExpectedAnswer] = useState("");

  const submit = async () => {
    if (!question.trim()) return alert("Question required");
    if (type === "mcq") {
      if (options.filter((o) => o.trim() !== "").length < 2) return alert("MCQ needs 2+ options");
      if (correctIndex === null || !options[correctIndex]?.trim()) return alert("Select correct option");
    } else {
      if (!expectedAnswer.trim()) return alert("Expected answer required");
    }

    await onCreate({
      type,
      question: question.trim(),
      options: type === "mcq" ? options.map((o) => o.trim()) : [""],
      correctIndex: type === "mcq" ? correctIndex : null,
      expectedAnswer: type === "short" ? expectedAnswer.trim() : "",
      imageDataUrl: undefined,
    });

    // reset
    setType("short");
    setQuestion("");
    setOptions(["", ""]);
    setCorrectIndex(0);
    setExpectedAnswer("");
  };

  return (
    <div className="mt-2 space-y-2">
      <label className="block">
        <div className="text-sm">Type</div>
        <select value={type} onChange={(e) => setType(e.target.value as PuzzleType)} className="mt-1 p-2 border rounded">
          <option value="short">Short</option>
          <option value="mcq">MCQ</option>
        </select>
      </label>

      <label className="block">
        <div className="text-sm">Question</div>
        <input value={question} onChange={(e) => setQuestion(e.target.value)} className="w-full mt-1 p-2 border rounded" />
      </label>

      {type === "mcq" ? (
        <>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input value={opt} onChange={(e) => setOptions((o) => { const c = [...o]; c[i] = e.target.value; return c; })} className="flex-1 p-2 border rounded" />
                <label className="text-sm flex items-center gap-1"><input type="radio" name="smc" checked={correctIndex === i} onChange={() => setCorrectIndex(i)} /> correct</label>
                <button onClick={() => setOptions((o) => o.filter((_, idx) => idx !== i))}>✖</button>
              </div>
            ))}
          </div>
          <button className="mt-1 border px-2 py-1 rounded" onClick={() => setOptions((o) => [...o, ""])}>Add option</button>
        </>
      ) : (
        <label>
          <div className="text-sm">Expected answer</div>
          <input value={expectedAnswer} onChange={(e) => setExpectedAnswer(e.target.value)} className="w-full mt-1 p-2 border rounded" />
        </label>
      )}

      <div className="flex justify-end">
        <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={submit}>Create & Link</button>
      </div>
    </div>
  );
}

/* =======================
   Main Page Component
   ======================= */
export default function EscapeRoomPage() {
  /* ---------- state: puzzles & hotspots ---------- */
  const [puzzles, setPuzzles] = useState<Puzzle[]>(() => loadPuzzlesLS());
  const [hotspots, setHotspots] = useState<Hotspot[]>(() => loadHotspotsLS());
  const [settings, setSettings] = useState<Settings>(() => loadSettingsLS());

  /* ---------- builder form state ---------- */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formType, setFormType] = useState<PuzzleType>("short");
  const [formQuestion, setFormQuestion] = useState("");
  const [formOptions, setFormOptions] = useState<string[]>(["", ""]);
  const [formCorrectIndex, setFormCorrectIndex] = useState<number | null>(0);
  const [formExpectedAnswer, setFormExpectedAnswer] = useState("");
  const [formPreviewImage, setFormPreviewImage] = useState<string | undefined>(undefined);
  const formImageRef = useRef<HTMLInputElement | null>(null);

  /* ---------- UI state ---------- */
  const [mode, setMode] = useState<"builder" | "play">("builder");
  const [assignPopup, setAssignPopup] = useState<{ hotspotId: string; xPct: number; yPct: number } | null>(null);
  const [modalHotspotIndex, setModalHotspotIndex] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  /* ---------- timer/play state ---------- */
  const [timeLeft, setTimeLeft] = useState<number>(settings.globalMinutes * 60);
  const timerRef = useRef<number | null>(null);
  const [completed, setCompleted] = useState<boolean[]>([]);

  /* ---------- refs for image container & dragging ---------- */
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  /* ---------- persist changes to localStorage ---------- */
  useEffect(() => savePuzzlesLS(puzzles), [puzzles]);
  useEffect(() => saveHotspotsLS(hotspots), [hotspots]);
  useEffect(() => saveSettingsLS(settings), [settings]);

  /* keep completed aligned with hotspots array length */
  useEffect(() => {
    setCompleted((prev) => {
      const copy = [...prev];
      while (copy.length < hotspots.length) copy.push(false);
      if (copy.length > hotspots.length) copy.splice(hotspots.length);
      return copy;
    });
  }, [hotspots.length]);

  /* timer management when entering play mode */
  useEffect(() => {
    if (mode !== "play") return;
    setTimeLeft(settings.globalMinutes * 60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode, settings.globalMinutes]);

  /* ---------- helper functions for puzzles ---------- */
  const resetForm = () => {
    setEditingId(null);
    setFormType("short");
    setFormQuestion("");
    setFormOptions(["", ""]);
    setFormCorrectIndex(0);
    setFormExpectedAnswer("");
    setFormPreviewImage(undefined);
    if (formImageRef.current) formImageRef.current.value = "";
  };

  const readImage = (file?: File): Promise<string | undefined> =>
    new Promise((resolve) => {
      if (!file) return resolve(undefined);
      const r = new FileReader();
      r.onload = () => resolve(typeof r.result === "string" ? r.result : undefined);
      r.readAsDataURL(file);
    });

  const addOrUpdatePuzzle = async () => {
    if (!formQuestion.trim()) return alert("Question required");
    if (formType === "mcq") {
      if (formOptions.filter((o) => o.trim() !== "").length < 2) return alert("MCQ needs 2+ options");
      if (formCorrectIndex === null || !formOptions[formCorrectIndex]?.trim()) return alert("Select correct option");
    } else {
      if (!formExpectedAnswer.trim()) return alert("Expected answer required");
    }

    let dataUrl: string | undefined = undefined;
    if (formImageRef.current?.files?.[0]) dataUrl = await readImage(formImageRef.current.files[0]);

    const newPuzzle: Puzzle = {
      id: editingId ?? uid(),
      type: formType,
      question: formQuestion.trim(),
      options: formType === "mcq" ? formOptions.map((x) => x.trim()) : [""],
      correctIndex: formType === "mcq" ? formCorrectIndex : null,
      expectedAnswer: formType === "short" ? formExpectedAnswer.trim() : "",
      imageDataUrl: dataUrl,
    };

    if (editingId) {
      setPuzzles((prev) => prev.map((p) => (p.id === editingId ? newPuzzle : p)));
    } else {
      setPuzzles((prev) => [...prev, newPuzzle]);
    }
    resetForm();
  };

  const startEditingPuzzle = (id: string) => {
    const p = puzzles.find((x) => x.id === id);
    if (!p) return;
    setEditingId(p.id);
    setFormType(p.type);
    setFormQuestion(p.question);
    setFormPreviewImage(p.imageDataUrl ?? undefined);
    if (p.type === "mcq") {
      setFormOptions([...p.options]);
      setFormCorrectIndex(p.correctIndex ?? 0);
    } else {
      setFormOptions(["", ""]);
      setFormCorrectIndex(0);
      setFormExpectedAnswer(p.expectedAnswer);
    }
    // scroll to builder form optionally
  };

  const deletePuzzle = (id: string) => {
    if (!confirm("Delete puzzle?")) return;
    // unlink hotspots that reference this puzzle
    setHotspots((hs) => hs.map((h) => (h.puzzleId === id ? { ...h, puzzleId: null } : h)));
    setPuzzles((ps) => ps.filter((p) => p.id !== id));
  };

  /* ---------- hotspots creation & dragging ---------- */
  const onImageClick_CreateHotspot = (ev: React.MouseEvent) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const xPct = clamp((x / rect.width) * 100);
    const yPct = clamp((y / rect.height) * 100);
    const id = uid();
    setHotspots((h) => [...h, { id, puzzleId: null, xPct, yPct }]);
    // open assign popup
    setAssignPopup({ hotspotId: id, xPct, yPct });
  };

  const onHotspotPointerDown = (ev: React.PointerEvent, hotspotId: string) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const startX = ev.clientX;
    const startY = ev.clientY;
    const h = hotspots.find((ht) => ht.id === hotspotId);
    if (!h) return;
    const px = (h.xPct / 100) * rect.width;
    const py = (h.yPct / 100) * rect.height;
    const offsetX = startX - (rect.left + px);
    const offsetY = startY - (rect.top + py);
    draggingRef.current = { id: hotspotId, offsetX, offsetY };
    (ev.target as Element).setPointerCapture(ev.pointerId);
  };

  useEffect(() => {
    function handlePointerMove(e: PointerEvent) {
      if (!draggingRef.current || !imageContainerRef.current) return;
      const rect = imageContainerRef.current.getBoundingClientRect();
      const { id, offsetX, offsetY } = draggingRef.current;
      const x = e.clientX - rect.left - offsetX;
      const y = e.clientY - rect.top - offsetY;
      const xPct = clamp((x / rect.width) * 100);
      const yPct = clamp((y / rect.height) * 100);
      setHotspots((hs) => hs.map((h) => (h.id === id ? { ...h, xPct, yPct } : h)));
    }
    function handlePointerUp() {
      draggingRef.current = null;
    }
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [hotspots]);

  const removeHotspot = (id: string) => {
    if (!confirm("Delete hotspot?")) return;
    setHotspots((h) => h.filter((x) => x.id !== id));
    setAssignPopup(null);
  };

  const assignHotspotToPuzzle = (hotspotId: string, puzzleId: string) => {
    setHotspots((h) => h.map((x) => (x.id === hotspotId ? { ...x, puzzleId } : x)));
    setAssignPopup(null);
  };

  const createPuzzleAndLink = async (hotspotId: string, newPuzzle: Omit<Puzzle, "id">) => {
    const p: Puzzle = { ...newPuzzle, id: uid() };
    setPuzzles((prev) => [...prev, p]);
    setHotspots((h) => h.map((x) => (x.id === hotspotId ? { ...x, puzzleId: p.id } : x)));
    setAssignPopup(null);
  };

  /* ---------- click handler for image container (builder) ---------- */
  const handleImageContainerClick = (e: React.MouseEvent) => {
    if (mode !== "builder") return;
    const target = e.target as HTMLElement;

    // ignore clicks inside hotspot UI popup
    if (target.closest?.(".hotspot-ui")) return;

    // ignore clicks on hotspots themselves (they have data-hotspot attr)
    if (target.dataset?.hotspot === "true") return;

    // if assign popup is open and user clicks outside popup => delete hotspot
    if (assignPopup) {
      removeHotspot(assignPopup.hotspotId);
      return;
    }

    // otherwise create new hotspot
    onImageClick_CreateHotspot(e);
  };

  /* ---------- Play mode modal open/close ---------- */
  const openModalForHotspotIndex = (idx: number) => {
    setModalHotspotIndex(idx);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setTimeout(() => setModalHotspotIndex(null), 200);
  };

  const submitAnswerForHotspot = (hotspotIdx: number, answer: string | number) => {
    const hotspot = hotspots[hotspotIdx];
    if (!hotspot?.puzzleId) return false;
    const p = puzzles.find((z) => z.id === hotspot.puzzleId);
    if (!p) return false;
    if (p.type === "mcq") {
      if (Number(answer) === p.correctIndex) {
        setCompleted((c) => {
          const copy = [...c];
          copy[hotspotIdx] = true;
          return copy;
        });
        return true;
      }
      return false;
    } else {
      const a = String(answer || "").trim().toLowerCase();
      const e = (p.expectedAnswer || "").trim().toLowerCase();
      if (a === e) {
        setCompleted((c) => {
          const copy = [...c];
          copy[hotspotIdx] = true;
          return copy;
        });
        return true;
      }
      return false;
    }
  };

  /* ---------- small helpers ---------- */
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const preparePayload = () => ({ puzzles, hotspots, settings });

  const saveToServerStub = async () => {
    // Replace with your API call later
    console.log("Prepared payload", preparePayload());
    alert("Payload prepared and logged to console. Replace with API call.");
  };

  /* ---------- UI rendering ---------- */
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Escape Room — Builder & Playtest</h1>

      {/* mode toggle */}
      <div className="mt-4 flex items-center gap-3">
        <button className={`px-3 py-2 rounded ${mode === "builder" ? "bg-emerald-600 text-white" : "bg-gray-100"}`} onClick={() => setMode("builder")}>Builder</button>
        <button className={`px-3 py-2 rounded ${mode === "play" ? "bg-emerald-600 text-white" : "bg-gray-100"}`} onClick={() => setMode("play")}>Player (Playtest)</button>
        <div className="ml-auto flex gap-2">
          <button className="px-3 py-2 rounded bg-slate-700 text-white" onClick={saveToServerStub}>Save (stub)</button>
          <button className="px-3 py-2 rounded bg-gray-200" onClick={() => {
            if (!confirm("Clear puzzles, hotspots and background?")) return;
            setPuzzles([]);
            setHotspots([]);
            setSettings({ globalMinutes: 5, bgImageDataUrl: null });
            localStorage.removeItem(LS_PUZZLES);
            localStorage.removeItem(LS_HOTSPOTS);
            localStorage.removeItem(LS_SETTINGS);
          }}>Clear All</button>
        </div>
      </div>

      {/* builder mode UI */}
      {mode === "builder" && (
        <>
          <section className="mt-4 p-4 border rounded">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <span className="text-sm">Timer (minutes)</span>
                <input type="number" min={1} value={settings.globalMinutes} onChange={(e) => setSettings((s) => ({ ...s, globalMinutes: Math.max(1, Number(e.target.value || 1)) }))} className="w-20 p-2 border rounded ml-2" />
              </label>

              <label className="flex items-center gap-2">
                <span className="text-sm">Background image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="ml-2"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const d = await readImage(f);
                    setSettings((s) => ({ ...s, bgImageDataUrl: d ?? null }));
                  }}
                />
              </label>

              <div className="ml-auto flex gap-2">
                <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={() => setMode("play")}>Start Escape Room</button>
                <button className="px-3 py-2 rounded bg-gray-200" onClick={() => alert(JSON.stringify(preparePayload(), null, 2))}>Inspect Data</button>
              </div>
            </div>
          </section>

          <section className="mt-4 grid md:grid-cols-3 gap-4">
            {/* puzzles list + form */}
            <aside className="md:col-span-1 p-3 border rounded">
              <h2 className="font-semibold">Puzzles ({puzzles.length})</h2>
              <ul className="mt-3 space-y-2 max-h-[40vh] overflow-auto">
                {puzzles.map((p, i) => (
                  <li key={p.id} className="p-2 border rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{i + 1}. {p.question}</div>
                        <div className="text-sm text-gray-500">{p.type === "mcq" ? "MCQ" : "Short answer"}</div>
                      </div>
                      <div className="flex flex-col gap-1 ml-3">
                        <button className="text-sm p-1" onClick={() => startEditingPuzzle(p.id)}>✎</button>
                        <button className="text-sm p-1 text-red-600" onClick={() => deletePuzzle(p.id)}>🗑</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <h3 className="font-medium">{editingId ? "Edit Puzzle" : "Create Puzzle"}</h3>
                <div className="mt-2 space-y-3">
                  <label className="block">
                    <span className="text-sm font-medium">Type</span>
                    <select value={formType} onChange={(e) => setFormType(e.target.value as PuzzleType)} className="mt-1 p-2 border rounded">
                      <option value="short">Short answer</option>
                      <option value="mcq">Multiple choice</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium">Question</span>
                    <input value={formQuestion} onChange={(e) => setFormQuestion(e.target.value)} className="w-full mt-1 p-2 border rounded" />
                  </label>

                  {formType === "mcq" && (
                    <div>
                      <span className="text-sm font-medium">Options</span>
                      <div className="mt-2 space-y-2">
                        {formOptions.map((opt, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input value={opt} onChange={(e) => setFormOptions((o) => { const c = [...o]; c[idx] = e.target.value; return c; })} className="flex-1 p-2 border rounded" placeholder={`Option ${idx + 1}`} />
                            <label className="text-sm flex items-center gap-1">
                              <input type="radio" name="correct" checked={formCorrectIndex === idx} onChange={() => setFormCorrectIndex(idx)} /> correct
                            </label>
                            <button onClick={() => setFormOptions((o) => o.filter((_, i) => i !== idx))}>✖</button>
                          </div>
                        ))}
                      </div>
                      <button className="mt-2 border px-3 py-1 rounded" onClick={() => setFormOptions((o) => [...o, ""])}>Add option</button>
                    </div>
                  )}

                  {formType === "short" && (
                    <label className="block">
                      <span className="text-sm font-medium">Expected answer</span>
                      <input value={formExpectedAnswer} onChange={(e) => setFormExpectedAnswer(e.target.value)} className="w-full mt-1 p-2 border rounded" />
                    </label>
                  )}

                  <label className="block">
                    <span className="text-sm font-medium">Optional image (puzzle)</span>
                    <input ref={formImageRef} type="file" accept="image/*" className="mt-1" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const fr = new FileReader();
                        fr.onload = () => setFormPreviewImage(typeof fr.result === "string" ? fr.result : undefined);
                        fr.readAsDataURL(f);
                      }
                    }} />
                    {formPreviewImage && <div className="mt-2 max-h-48 rounded overflow-hidden"><Image src={formPreviewImage} alt="preview" width={400} height={300} unoptimized /></div>}
                  </label>

                  <div className="flex gap-2">
                    <button onClick={addOrUpdatePuzzle} className="px-3 py-1 rounded bg-blue-600 text-white">{editingId ? "Save changes" : "Add puzzle"}</button>
                    <button onClick={resetForm} className="px-3 py-1 rounded bg-gray-300">Reset</button>
                  </div>
                </div>
              </div>
            </aside>

            {/* Canvas */}
            <div className="md:col-span-2 p-4 border rounded">
              <h2 className="font-semibold">Room Canvas (click to add hotspot)</h2>

              <div
                ref={imageContainerRef}
                onClick={handleImageContainerClick}
                className="relative mt-3 w-full h-[70vh] bg-black/5 rounded overflow-visible flex items-center justify-center"
              >
                {/* background */}
                {settings.bgImageDataUrl ? (
                  <Image src={settings.bgImageDataUrl} alt="Background" fill style={{ objectFit: "cover" }} unoptimized />
                ) : (
                  <div className="text-sm text-gray-500">No background selected — upload one above</div>
                )}

                {/* hotspots */}
                {hotspots.map((h, idx) => {
                  const left = `${h.xPct}%`;
                  const top = `${h.yPct}%`;
                  const solved = completed[idx];
                  const dotClass = solved ? "bg-green-500 ring-4 ring-green-300" : "bg-white ring-2 ring-slate-800";

                  return (
                    <div
                      key={h.id}
                      data-hotspot="true"
                      onPointerDown={(ev) => {
                        if (mode !== "builder") return;
                        onHotspotPointerDown(ev, h.id);
                      }}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        if (mode === "builder") {
                          setAssignPopup({ hotspotId: h.id, xPct: h.xPct, yPct: h.yPct });
                          return;
                        }
                      }}
                      style={{ position: "absolute", left, top, transform: "translate(-50%, -50%)", cursor: mode === "builder" ? "grab" : "pointer", zIndex: 30 }}
                    >
                      <div className={`w-6 h-6 rounded-full ${dotClass} shadow-lg flex items-center justify-center`} />
                    </div>
                  );
                })}

                {/* assign popup (hotspot-ui) — can expand outside canvas */}
                {assignPopup && mode === "builder" && (
                  <div
                    className="absolute z-40 p-3 bg-white border rounded shadow hotspot-ui"
                    style={{ left: `${assignPopup.xPct}%`, top: `${assignPopup.yPct}%`, transform: "translate(8px, -50%)", minWidth: 260 }}
                  >
                    <div className="flex justify-between items-center">
                      <div className="font-medium">Link hotspot</div>
                      <div className="flex items-center gap-2">
                        <button className="text-sm text-red-600" onClick={() => removeHotspot(assignPopup.hotspotId)}>Delete</button>
                        <button className="text-sm text-gray-600" onClick={() => setAssignPopup(null)}>Close</button>
                      </div>
                    </div>

                    <div className="mt-2">
                      <label className="block text-sm">Choose existing puzzle</label>
                      <select className="w-full p-2 border rounded mt-1" defaultValue="" onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        assignHotspotToPuzzle(assignPopup.hotspotId, val);
                      }}>
                        <option value="">-- select puzzle --</option>
                        {puzzles.map((p) => <option key={p.id} value={p.id}>{p.question}</option>)}
                      </select>
                    </div>

                    <div className="mt-3 border-t pt-3">
                      <div className="text-sm font-medium">Or create new</div>
                      <SmallCreateForm onCreate={async (np) => { await createPuzzleAndLink(assignPopup.hotspotId, np); }} />
                    </div>

                    <div className="mt-2 text-xs text-gray-500">Hotspot coords: {assignPopup.xPct.toFixed(1)}%, {assignPopup.yPct.toFixed(1)}%</div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {/* player mode UI */}
      {mode === "play" && (
        <>
          <section className="mt-4 p-4 border rounded flex justify-between items-center">
            <div>
              <span className="text-sm text-gray-700">Timer:</span>{" "}
              <span className="font-mono text-xl ml-2">{fmt(timeLeft)}</span>
            </div>
            <div className="flex gap-2">
              <button className="border px-3 py-1 rounded" onClick={() => setMode("builder")}>Back to Builder</button>
              <button className="px-3 py-1 rounded bg-yellow-500" onClick={() => {
                if (confirm("Restart playtest?")) {
                  setTimeLeft(settings.globalMinutes * 60);
                  setCompleted((c) => c.map(() => false));
                }
              }}>Restart</button>
            </div>
          </section>

          <section className="mt-4 p-4 border rounded">
            <div className="relative w-full h-[70vh] rounded overflow-hidden bg-black/5">
              {settings.bgImageDataUrl ? (
                <Image src={settings.bgImageDataUrl} alt="Background" fill style={{ objectFit: "cover" }} unoptimized />
              ) : (
                <div className="text-sm text-gray-500 p-4">No background set — switch to Builder to upload one.</div>
              )}

              {hotspots.map((h, idx) => {
                const left = `${h.xPct}%`;
                const top = `${h.yPct}%`;
                const solved = completed[idx];
                const dotClass = solved ? "bg-green-500 ring-4 ring-green-300" : "bg-blue-500 ring-4 ring-blue-300";

                return (
                  <div
                    key={h.id}
                    onClick={() => {
                      // open modal for this hotspot index
                      openModalForHotspotIndex(idx);
                    }}
                    style={{ position: "absolute", left, top, transform: "translate(-50%, -50%)", cursor: "pointer", zIndex: 30 }}
                  >
                    <div className={`w-6 h-6 rounded-full ${dotClass} shadow-lg flex items-center justify-center`} />
                  </div>
                );
              })}
            </div>
          </section>

          {/* puzzle modal for play */}
          {modalHotspotIndex !== null && modalHotspotIndex >= 0 && modalHotspotIndex < hotspots.length && (() => {
            const hotspot = hotspots[modalHotspotIndex];
            const puzzle = hotspot?.puzzleId ? puzzles.find((p) => p.id === hotspot.puzzleId) ?? null : null;
            if (!puzzle) {
              return createPortal(
                <>
                  <div className="fixed inset-0 z-40 bg-black/40" onClick={closeModal} />
                  <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded shadow">
                    <h3 className="text-lg font-semibold">No puzzle assigned</h3>
                    <p className="mt-2">This hotspot is not linked to a puzzle. Return to Builder to assign one.</p>
                    <div className="mt-4 text-right"><button className="px-3 py-1 border rounded" onClick={closeModal}>Close</button></div>
                  </div>
                </>,
                document.body
              );
            }
            return <PuzzleModal puzzle={puzzle} open={modalOpen} onClose={closeModal} onSubmit={(ans) => submitAnswerForHotspot(modalHotspotIndex, ans)} />;
          })()}
        </>
      )}
    </main>
  );
}
