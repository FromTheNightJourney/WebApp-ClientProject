"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";


type PuzzleType = "short" | "mcq";

type Puzzle = {
  id: string;
  type: PuzzleType;
  question: string;
  options: string[];
  correctIndex: number | null;
  expectedAnswer: string;
  imageDataUrl?: string;
};

type Hotspot = {
  id: string;
  puzzleId: string | null;
  xPct: number; 
  yPct: number; 
};

type Settings = {
  globalMinutes: number;
  bgImageDataUrl?: string | null;
  roomId?: string;
};

type ImageDimensions = {
  scaleFactorX: number;
  scaleFactorY: number;
  offsetX: number; 
  offsetY: number; 
  containerWidth: number;
  containerHeight: number;
};


/* LocalStorage */
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

/* Utilities */
const uid = () => Math.random().toString(36).slice(2, 9);
const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));

const useImageDimensions = (containerRef: React.RefObject<HTMLDivElement | null>, imageUrl: string | null): ImageDimensions => {
  const [dims, setDims] = useState<ImageDimensions>({ 
    scaleFactorX: 1, 
    scaleFactorY: 1, 
    offsetX: 0, 
    offsetY: 0,
    containerWidth: 0,
    containerHeight: 0
  });

  const calculate = useCallback(() => {
    const containerEl = containerRef.current;
    if (!containerEl || !imageUrl) {
      setDims({ scaleFactorX: 1, scaleFactorY: 1, offsetX: 0, offsetY: 0, containerWidth: 0, containerHeight: 0 });
      return;
    }

    const containerWidth = containerEl.clientWidth;
    const containerHeight = containerEl.clientHeight;

    if (containerWidth === 0 || containerHeight === 0) {
      return;
    }

    const img = new window.Image();
    img.onload = () => {
      const imageRatio = img.width / img.height;
      const containerRatio = containerWidth / containerHeight;

      let finalWidth: number;
      let finalHeight: number;

      if (imageRatio > containerRatio) {
        finalWidth = containerWidth;
        finalHeight = finalWidth / imageRatio;
      } else {
        finalHeight = containerHeight;
        finalWidth = finalHeight * imageRatio;
      }

      const offsetX = (containerWidth - finalWidth) / 2 / containerWidth * 100;
      const offsetY = (containerHeight - finalHeight) / 2 / containerHeight * 100;
      const scaleFactorX = finalWidth / containerWidth;
      const scaleFactorY = finalHeight / containerHeight;

      setDims({
        scaleFactorX,
        scaleFactorY,
        offsetX,
        offsetY,
        containerWidth,
        containerHeight
      });
    };
    img.src = imageUrl;
  }, [containerRef, imageUrl]);

  useEffect(() => {
    calculate();

    let ro: ResizeObserver | null = null;
    const el = containerRef.current;

    if (typeof window !== "undefined" && "ResizeObserver" in window && el) {
      ro = new ResizeObserver(() => {
        setTimeout(calculate, 100);
      });
      ro.observe(el);
    }

    const handleResize = () => {
      setTimeout(calculate, 100);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (ro && el) {
        ro.unobserve(el);
      }
    };
  }, [calculate, containerRef]);

  return dims;
};

function BackgroundImage({ src, alt }: { src?: string | null; alt?: string }) {
  if (!src) return null;
  return (
    <div className="absolute inset-0">
      <Image src={src} alt={alt ?? "background"} fill style={{ objectFit: "contain" }} unoptimized />
    </div>
  );
}

function HotspotDot({ 
  left, 
  top, 
  solved, 
  mode, 
  onPointerDown, 
  onClick 
}: {
  left: string;
  top: string;
  solved?: boolean;
  mode: "builder" | "play";
  // did use AI for debugging here
  onPointerDown?: (ev: React.PointerEvent<HTMLDivElement>) => void;
  onClick?: (ev: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const dotClass = solved 
    ? "bg-green-500 ring-4 ring-green-300" 
    : (mode === "play" ? "bg-blue-500 ring-4 ring-blue-300" : "bg-background ring-2 ring-shade");

  return (
    <div
      data-hotspot="true"
      onPointerDown={onPointerDown}
      onClick={(ev) => { 
        ev.stopPropagation(); 
        if (onClick) onClick(ev); 
      }}
      style={{ 
        position: "absolute", 
        left, 
        top, 
        transform: "translate(-50%, -50%)", 
        cursor: mode === "builder" ? "grab" : "pointer", 
        zIndex: 30 
      }}
    >
      <div className={`w-6 h-6 rounded-full ${dotClass} shadow-lg flex items-center justify-center`} />
    </div>
  );
}

/* Modal */
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
  const [error, setError] = useState<string | null>(null);

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
        className={`fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-lg p-6 shadow-2xl transition-all duration-200 ${
          open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        } bg-background text-primary`}
        role="dialog"
      >
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold">Puzzle</h2>
            <p className="text-sm mt-2 whitespace-pre-wrap">{puzzle.question}</p>
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
              style={{ color: "var(--foreground)", backgroundColor: "var(--background)" }}
            />
          )}
        </div>

          <div className="mt-4">
            {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
            <div className="flex justify-end gap-2">
              <button className="border px-3 py-1 rounded" onClick={onClose}>Close</button>
              <button
                className="bg-emerald-600 text-white px-3 py-1 rounded"
                onClick={() => {
                  setError(null);
                  const ok = onSubmit(puzzle.type === "mcq" ? choiceRef.current ?? -1 : textRef.current);
                  if (ok) {
                    onClose();
                  } else {
                    setError("Incorrect — try again.");
                  }
                }}
              >
                Submit
              </button>
            </div>
          </div>
      </div>
    </>,
    document.body
  );
};

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

/* Puzzle Component */
const PuzzleCard = ({ 
  puzzle, 
  index, 
  onEdit, 
  onDelete,
  isLinked 
}: { 
  puzzle: Puzzle;
  index: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isLinked: boolean;
}) => {
  return (
    <div className={`p-4 border rounded-lg bg-hover shadow-sm hover:shadow-md transition-shadow ${isLinked ? 'border-green-200 bg-green-50' : 'border-shade'}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            {index + 1}
          </span>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            puzzle.type === 'mcq' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
          }`}>
            {puzzle.type === 'mcq' ? 'MCQ' : 'Short Answer'}
          </span>
          {isLinked && (
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
              Linked
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button 
            onClick={() => onEdit(puzzle.id)}
            className="p-1 text-primary/70 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit puzzle"
          >
            ✎
          </button>
          <button 
            onClick={() => onDelete(puzzle.id)}
            className="p-1 text-primary/70 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete puzzle"
          >
            🗑
          </button>
        </div>
      </div>
      
      <p className="text-sm text-primary font-medium mb-2 line-clamp-2">{puzzle.question}</p>
      
      {puzzle.type === 'mcq' ? (
        <div className="text-xs text-primary/70 space-y-1">
          <div><span className="font-medium">Options:</span> {puzzle.options.length}</div>
          <div><span className="font-medium">Correct:</span> Option {puzzle.correctIndex !== null ? puzzle.correctIndex + 1 : 'N/A'}</div>
        </div>
      ) : (
        <div className="text-xs text-primary/70">
          <div><span className="font-medium">Answer:</span> {puzzle.expectedAnswer}</div>
        </div>
      )}
      
      {puzzle.imageDataUrl && (
        <div className="mt-2 text-xs text-primary/70 flex items-center gap-1">
          <span>🖼️ Has image</span>
        </div>
      )}
    </div>
  );
};

/* Main Page */
export default function EscapeRoomPage() {
  const [puzzles, setPuzzles] = useState<Puzzle[]>(() => loadPuzzlesLS());
  const [hotspots, setHotspots] = useState<Hotspot[]>(() => loadHotspotsLS());
  const [settings, setSettings] = useState<Settings>(() => loadSettingsLS());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formType, setFormType] = useState<PuzzleType>("short");
  const [formQuestion, setFormQuestion] = useState("");
  const [formOptions, setFormOptions] = useState<string[]>(["", ""]);
  const [formCorrectIndex, setFormCorrectIndex] = useState<number | null>(0);
  const [formExpectedAnswer, setFormExpectedAnswer] = useState("");
  const [formPreviewImage, setFormPreviewImage] = useState<string | undefined>(undefined);
  const formImageRef = useRef<HTMLInputElement | null>(null);

  const [mode, setMode] = useState<"builder" | "play">("builder");
  const [assignPopup, setAssignPopup] = useState<{ hotspotId: string; xPct: number; yPct: number } | null>(null);
  const [modalHotspotIndex, setModalHotspotIndex] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"puzzles" | "settings">("puzzles");

  const [timeLeft, setTimeLeft] = useState<number>(settings.globalMinutes * 60);
  const timerRef = useRef<number | null>(null);
  const [completed, setCompleted] = useState<boolean[]>([]);

  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  
  const imageDims = useImageDimensions(imageContainerRef, settings.bgImageDataUrl ?? null);

useEffect(() => {
    const loadFromDatabase = async () => {
      const params = new URLSearchParams(window.location.search);
      const urlId = params.get("id");

      if (urlId) {
        try {
          console.log("Fetching room:", urlId);
          const res = await fetch(`/api/escape-room/load?id=${urlId}`);
          
          if (!res.ok) {
            if (res.status === 404) alert("Unfortunately, unable to find room.");
            throw new Error("Failed to load");
          }

          const data = await res.json();

          setPuzzles(data.puzzles);
          setHotspots(data.hotspots);
          setSettings({
            ...data.settings,
            roomId: urlId 
          });
          
          console.log("The room has been successfully loaded!");
        } catch (e) {
          console.error("Load error:", e);
        }
      }
    };

    loadFromDatabase();
  }, []); 

  useEffect(() => savePuzzlesLS(puzzles), [puzzles]);
  useEffect(() => saveHotspotsLS(hotspots), [hotspots]);
  useEffect(() => saveSettingsLS(settings), [settings]);

  useEffect(() => {
    setCompleted((prev) => {
      const copy = [...prev];
      while (copy.length < hotspots.length) copy.push(false);
      if (copy.length > hotspots.length) copy.splice(hotspots.length);
      return copy;
    });
  }, [hotspots.length]);

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

  /* puzzle helper function */
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
    if (!formQuestion.trim()) return alert("A question is required here.");
    if (formType === "mcq") {
      if (formOptions.filter((o) => o.trim() !== "").length < 2) return alert("The MCQ needs 2+ options. That's what makes it 'multiple choice'.");
      if (formCorrectIndex === null || !formOptions[formCorrectIndex]?.trim()) return alert("Please choose the right option.");
    } else {
      if (!formExpectedAnswer.trim()) return alert("Expected answer required.");
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
  };

  const deletePuzzle = (id: string) => {
    if (!confirm("Delete puzzle?")) return;
    setHotspots((hs) => hs.map((h) => (h.puzzleId === id ? { ...h, puzzleId: null } : h)));
    setPuzzles((ps) => ps.filter((p) => p.id !== id));
  };

  const isPuzzleLinked = (puzzleId: string) => {
    return hotspots.some(hotspot => hotspot.puzzleId === puzzleId);
  };

  const onImageClick_CreateHotspot = (ev: React.MouseEvent) => {
    if (!imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;

    const containerXPct = (x / rect.width) * 100;
    const containerYPct = (y / rect.height) * 100;


    const xPct = clamp((containerXPct - imageDims.offsetX) / imageDims.scaleFactorX);
    const yPct = clamp((containerYPct - imageDims.offsetY) / imageDims.scaleFactorY);
    
    const id = uid();
    setHotspots((h) => [...h, { id, puzzleId: null, xPct, yPct }]);
    
    setAssignPopup({ hotspotId: id, xPct: containerXPct, yPct: containerYPct });
  };

  const onHotspotPointerDown = (ev: React.PointerEvent, hotspotId: string) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const startX = ev.clientX;
    const startY = ev.clientY;
    const h = hotspots.find((ht) => ht.id === hotspotId);
    if (!h) return;
    
    const currentContainerXPct = h.xPct * imageDims.scaleFactorX + imageDims.offsetX;
    const currentContainerYPct = h.yPct * imageDims.scaleFactorY + imageDims.offsetY;

    const px = (currentContainerXPct / 100) * rect.width;
    const py = (currentContainerYPct / 100) * rect.height;

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
      
      const containerX = e.clientX - rect.left - offsetX;
      const containerY = e.clientY - rect.top - offsetY;

      const containerXPct = (containerX / rect.width) * 100;
      const containerYPct = (containerY / rect.height) * 100;

      const xPct = clamp((containerXPct - imageDims.offsetX) / imageDims.scaleFactorX);
      const yPct = clamp((containerYPct - imageDims.offsetY) / imageDims.scaleFactorY);
      
      setHotspots((hs) => hs.map((h) => (h.id === id ? { ...h, xPct, yPct } : h)));
      
      setAssignPopup((prev) => (prev ? { ...prev, xPct: containerXPct, yPct: containerYPct } : null));
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
  }, [hotspots, imageDims.offsetX, imageDims.offsetY, imageDims.scaleFactorX, imageDims.scaleFactorY]);

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

  const handleImageContainerClick = (e: React.MouseEvent) => {
    if (mode !== "builder") return;
    const target = e.target as HTMLElement;

    if (target.closest?.(".hotspot-ui")) return;

    if (target.dataset?.hotspot === "true") return;

    if (assignPopup) {
      removeHotspot(assignPopup.hotspotId);
      return;
    }

    onImageClick_CreateHotspot(e);
  };

  const openModalForHotspotIndex = (idx: number) => {
    setModalHotspotIndex(idx);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setTimeout(() => setModalHotspotIndex(null), 200);
  };

  // success popup state (in-app modal)
  const [successPopup, setSuccessPopup] = useState<{ open: boolean; title?: string; message?: string }>({ open: false });


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

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const handleCopyId = async () => {
    if (!settings.roomId) return;
    try {
      await navigator.clipboard.writeText(settings.roomId);
      alert("The Room ID has been copied to your clipboard.");
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleLoadRoom = () => {
    const id = prompt("Enter the ID of the room you want to load:");
    if (id && id.trim()) {
      window.location.href = `/escape-room?id=${id.trim()}`;
    }
  };

  const handleDeleteRoom = async () => {
    if (!settings.roomId) return;

    // user confirmation (obviously)
    const confirmDelete = confirm(
      "⚠️ ARE YOU SURE?\n\nThis will permanently delete this room and all its puzzles from the database.\nThis cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      // call API
      const res = await fetch(`/api/escape-room/delete?id=${settings.roomId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      alert("🗑️ Room deleted successfully.");
      
      // delete everything
      setPuzzles([]);
      setHotspots([]);
      setSettings({ globalMinutes: 5, bgImageDataUrl: null, roomId: undefined });
      window.history.pushState({}, "", window.location.pathname); // Remove ?id=... from URL

    } catch (err) {
      console.error(err);
      alert("❌ Error deleting room");
    }
  };

  const saveToServerStub = async () => {
    const roomName = prompt("Please enter a name for your room:", "Just An Escape Room");
    if (!roomName) return;

    try {
      const payload = {
        roomId: settings.roomId,
        name: roomName,
        settings: settings,
        puzzles: puzzles,
        hotspots: hotspots,
      };

      const res = await fetch("/api/escape-room/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save");

      const data = await res.json();
      
      setSettings(prev => ({ ...prev, roomId: data.roomId }));
      alert("The room has been saved successfully. Your Room ID is: " + data.roomId);
      
    } catch (e) {
      console.error(e);
      alert("Something went wrong. Couldn't save to the database.");
    }
  };

  

  const getHotspotContainerPosition = (h: Hotspot) => {
    const dims = imageDims;
    
    if (dims.containerWidth === 0 || dims.containerHeight === 0) {
      return { left: `${h.xPct}%`, top: `${h.yPct}%` };
    }
    
    const left = `${h.xPct * dims.scaleFactorX + dims.offsetX}%`;
    const top = `${h.yPct * dims.scaleFactorY + dims.offsetY}%`;
    return { left, top };
  };

  useEffect(() => {
    if (mode !== "play") return;
    if (!hotspots.length) return;

    const linkedIndexes = hotspots.map((h, i) => ({ linked: !!h.puzzleId, i })).filter(x => x.linked).map(x => x.i);
    if (linkedIndexes.length === 0) return;

    const allSolved = linkedIndexes.every((idx) => !!completed[idx]);
    if (allSolved) {
      // stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setSuccessPopup({ open: true, title: "You've successfully escaped!", message: "All puzzles solved — well done :D" });
    }
  }, [completed, hotspots, mode]);

  /* UI render */
  return (
    <main className="min-h-screen bg-background text-primary">
      {/* Header */}
      <header className="bg-hover border-b border-shade sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-primary">Escape Room Builder</h1>
              <p className="text-sm text-primary/70 mt-1">Create and test interactive escape room experiences</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex bg-hover rounded-lg p-1">
                <button 
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    mode === "builder" ? "bg-button text-primary shadow-sm" : "text-primary/70 hover:text-primary"
                  }`}
                  onClick={() => setMode("builder")}
                >
                  Builder
                </button>
                <button 
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    mode === "play" ? "bg-button text-primary shadow-sm" : "text-primary/70 hover:text-primary"
                  }`}
                  onClick={() => setMode("play")}
                >
                  Player (Playtest)
                </button>
              </div>
              
<div className="flex gap-2">
  {/* load button and stuff */}
  <button 
    className="px-4 py-2 border border-blue-200 text-blue-700 bg-blue-50 rounded-md text-sm font-medium hover:bg-blue-100 transition-colors"
    onClick={handleLoadRoom}
  >
    📂 Load Room
  </button>

  {/* copy button ID if saved) */}
  {settings.roomId && (
    <button 
      className="px-4 py-2 border border-purple-200 text-purple-700 bg-purple-50 rounded-md text-sm font-medium hover:bg-purple-100 transition-colors"
      onClick={handleCopyId}
      title={settings.roomId}
    >
      📋 Copy ID
    </button>
  )}

  {/* save button */}
  <button 
    className="px-4 py-2 bg-slate-700 text-white rounded-md text-sm font-medium hover:bg-slate-800 transition-colors"
    onClick={saveToServerStub}
  >
    💾 Save
  </button>

  {/* Delete Button - Only show if saved in DB */}
{settings.roomId && (
  <button 
    className="px-4 py-2 border border-red-200 text-red-700 bg-red-50 rounded-md text-sm font-medium hover:bg-red-100 transition-colors"
    onClick={handleDeleteRoom}
  >
    🗑 Delete
  </button>
)}
  
  {/* clear all */}
  <button 
    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors"
    onClick={() => {
      if (!confirm("Clear all puzzles, hotspots and background?")) return;
      setPuzzles([]);
      setHotspots([]);
      setSettings({ globalMinutes: 5, bgImageDataUrl: null, roomId: undefined }); // Clear ID too
      window.history.pushState({}, "", window.location.pathname);
    }}
  >
    Clear
  </button>
</div>
            </div>
          </div>
        </div>
      </header>

      {/* builder mode */}
      {mode === "builder" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-hover rounded-lg p-4 shadow-sm border border-shade">
              <div className="text-2xl font-bold text-primary">{puzzles.length}</div>
              <div className="text-sm text-primary/70">Total Puzzles</div>
            </div>
            <div className="bg-hover rounded-lg p-4 shadow-sm border border-shade">
              <div className="text-2xl font-bold text-primary">{hotspots.length}</div>
              <div className="text-sm text-primary/70">Hotspots</div>
            </div>
            <div className="bg-hover rounded-lg p-4 shadow-sm border border-shade">
              <div className="text-2xl font-bold text-primary">
                {puzzles.filter(p => isPuzzleLinked(p.id)).length}
              </div>
              <div className="text-sm text-primary/70">Linked Puzzles</div>
            </div>
            <div className="bg-hover rounded-lg p-4 shadow-sm border border-shade">
              <div className="text-2xl font-bold text-primary">{settings.globalMinutes}m</div>
              <div className="text-sm text-primary/70">Time Limit</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Tabs */}
              <div className="bg-hover rounded-lg shadow-sm border border-shade">
                <div className="flex border-b border-shade">
                  <button
                    className={`flex-1 py-3 px-4 text-sm font-medium text-center ${
                      activeTab === "puzzles" 
                        ? "text-blue-600 border-b-2 border-blue-600" 
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setActiveTab("puzzles")}
                  >
                    Puzzles ({puzzles.length})
                  </button>
                  <button
                    className={`flex-1 py-3 px-4 text-sm font-medium text-center ${
                      activeTab === "settings" 
                        ? "text-blue-600 border-b-2 border-blue-600" 
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setActiveTab("settings")}
                  >
                    Settings
                  </button>
                </div>

                <div className="p-4">
                  {activeTab === "puzzles" ? (
                    <div className="space-y-4">
                      {/* Create Puzzle Form */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="font-semibold text-blue-900 mb-3">
                          {editingId ? "Edit Puzzle" : "Create New Puzzle"}
                        </h3>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select 
                              value={formType} 
                              onChange={(e) => setFormType(e.target.value as PuzzleType)} 
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="short">Short Answer</option>
                              <option value="mcq">Multiple Choice</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                            <textarea 
                              value={formQuestion} 
                              onChange={(e) => setFormQuestion(e.target.value)} 
                              rows={3}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter your puzzle question..."
                            />
                          </div>

                          {formType === "mcq" && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                              <div className="space-y-2">
                                {formOptions.map((opt, idx) => (
                                  <div key={idx} className="flex gap-2 items-center">
                                    <input 
                                      type="radio"
                                      name="correctOption"
                                      checked={formCorrectIndex === idx}
                                      onChange={() => setFormCorrectIndex(idx)}
                                      className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <input 
                                      value={opt} 
                                      onChange={(e) => setFormOptions((o) => { const c = [...o]; c[idx] = e.target.value; return c; })} 
                                      className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      placeholder={`Option ${idx + 1}`}
                                    />
                                    <button 
                                      onClick={() => setFormOptions((o) => o.filter((_, i) => i !== idx))}
                                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <button 
                                onClick={() => setFormOptions((o) => [...o, ""])}
                                className="mt-2 px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                              >
                                + Add Option
                              </button>
                            </div>
                          )}

                          {formType === "short" && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Answer</label>
                              <input 
                                value={formExpectedAnswer} 
                                onChange={(e) => setFormExpectedAnswer(e.target.value)} 
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter the expected answer..."
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Puzzle Image (Optional)</label>
                            <input 
                              ref={formImageRef} 
                              type="file" 
                              accept="image/*" 
                              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  const fr = new FileReader();
                                  fr.onload = () => setFormPreviewImage(typeof fr.result === "string" ? fr.result : undefined);
                                  fr.readAsDataURL(f);
                                }
                              }} 
                            />
                            {formPreviewImage && (
                              <div className="mt-2 max-h-32 rounded-md overflow-hidden border">
                                <Image src={formPreviewImage} alt="preview" width={200} height={150} unoptimized className="w-full h-auto" />
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 pt-2">
                            <button 
                              onClick={addOrUpdatePuzzle} 
                              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                            >
                              {editingId ? "Update Puzzle" : "Create Puzzle"}
                            </button>
                            {editingId && (
                              <button 
                                onClick={resetForm}
                                className="px-4 py-2 bg-hover text-primary/70 rounded-md hover:bg-shade transition-colors font-medium"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* puzzles */}
                      <div>
                        <h3 className="font-semibold text-primary mb-3">All Puzzles</h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {puzzles.length === 0 ? (
                            <div className="text-center py-8 text-primary/70">
                              <div className="text-lg mb-2">No puzzles yet</div>
                              <div className="text-sm">Create your first puzzle above</div>
                            </div>
                          ) : (
                            puzzles.map((puzzle, index) => (
                              <PuzzleCard
                                key={puzzle.id}
                                puzzle={puzzle}
                                index={index}
                                onEdit={startEditingPuzzle}
                                onDelete={deletePuzzle}
                                isLinked={isPuzzleLinked(puzzle.id)}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* settings */
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Time Limit (minutes)</label>
                        <input 
                          type="number" 
                          min={1} 
                          value={settings.globalMinutes} 
                          onChange={(e) => setSettings((s) => ({ ...s, globalMinutes: Math.max(1, Number(e.target.value || 1)) }))} 
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Background Image</label>
                        <input
                          type="file"
                          accept="image/*"
                          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const d = await readImage(f);
                            setSettings((s) => ({ ...s, bgImageDataUrl: d ?? null }));
                          }}
                        />
                        {settings.bgImageDataUrl && (
                          <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
                            <span>✓ Background image loaded</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-4">
                        <button 
                          className="w-full px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors font-medium"
                          onClick={() => setMode("play")}
                        >
                          Start Escape Room Test
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* canvas */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Room Canvas</h2>
                  <div className="text-sm text-gray-600">
                    {hotspots.length} hotspots • Click to add new hotspot
                  </div>
                </div>

                <div
                  ref={imageContainerRef}
                  onClick={handleImageContainerClick}
                  className="relative w-full h-[600px] bg-gray-100 rounded-lg overflow-visible flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors"
                >
                  {/* background */}
                  {settings.bgImageDataUrl ? (
                    <BackgroundImage src={settings.bgImageDataUrl} alt="Background" />
                  ) : (
                    <div className="text-center text-gray-500">
                      <div className="text-lg mb-2">No background image</div>
                      <div className="text-sm">Upload a background image in Settings</div>
                    </div>
                  )}

                  {/* hotspots */}
                  {hotspots.map((h, idx) => {
                    const { left, top } = getHotspotContainerPosition(h);
                    const solved = completed[idx];
                    return (
                      <HotspotDot
                        key={h.id}
                        left={left}
                        top={top}
                        solved={solved}
                        mode={mode}
                        onPointerDown={(ev) => { if (mode === "builder") onHotspotPointerDown(ev, h.id); }}
                        onClick={() => {
                          if (mode === "builder") {
                            const currentContainerXPct = h.xPct * imageDims.scaleFactorX + imageDims.offsetX;
                            const currentContainerYPct = h.yPct * imageDims.scaleFactorY + imageDims.offsetY;
                            setAssignPopup({ hotspotId: h.id, xPct: currentContainerXPct, yPct: currentContainerYPct });
                            return;
                          }
                        }}
                      />
                    );
                  })}

                  {/* assign popup (hotspot-ui) */}
                  {assignPopup && mode === "builder" && (
                    <div
                      className="absolute z-40 p-4 bg-white border border-gray-200 rounded-lg shadow-lg hotspot-ui"
                      style={{ left: `${assignPopup.xPct}%`, top: `${assignPopup.yPct}%`, transform: "translate(12px, -50%)", minWidth: 280 }}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <div className="font-semibold text-gray-900">Link Hotspot</div>
                        <div className="flex items-center gap-2">
                          <button 
                            className="text-sm text-red-600 hover:text-red-800 transition-colors" 
                            onClick={() => removeHotspot(assignPopup.hotspotId)}
                          >
                            Delete
                          </button>
                          <button 
                            className="text-sm text-gray-600 hover:text-gray-800 transition-colors" 
                            onClick={() => setAssignPopup(null)}
                          >
                            Close
                          </button>
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Choose existing puzzle</label>
                        <select 
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                          defaultValue="" 
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            assignHotspotToPuzzle(assignPopup.hotspotId, val);
                          }}
                        >
                          <option value="">-- Select puzzle --</option>
                          {puzzles.map((p) => <option key={p.id} value={p.id}>{p.question}</option>)}
                        </select>
                      </div>

                      <div className="border-t pt-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">Or create new puzzle</div>
                        <SmallCreateForm onCreate={async (np) => { await createPuzzleAndLink(assignPopup.hotspotId, np); }} />
                      </div>
                      
                      {/* internal coords for debug */}
                      {hotspots.find(h => h.id === assignPopup.hotspotId) && (
                          <div className="mt-2 text-xs text-gray-500">
                              Hotspot coordinates: {hotspots.find(h => h.id === assignPopup.hotspotId)?.xPct.toFixed(1)}%, {hotspots.find(h => h.id === assignPopup.hotspotId)?.yPct.toFixed(1)}%
                          </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* player mode UI */}
      {mode === "play" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-sm text-gray-700 font-medium">Time Remaining:</span>{" "}
                  <span className="font-mono text-2xl font-bold ml-2">{fmt(timeLeft)}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {completed.filter(Boolean).length} of {hotspots.length} puzzles solved
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium"
                  onClick={() => setMode("builder")}
                >
                  Back to Builder
                </button>
                <button 
                  className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors font-medium"
                  onClick={() => {
                    if (confirm("Restart playtest?")) {
                      setTimeLeft(settings.globalMinutes * 60);
                      setCompleted((c) => c.map(() => false));
                    }
                  }}
                >
                  Restart
                </button>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div ref={imageContainerRef} className="relative w-full h-[70vh] rounded-lg overflow-hidden bg-gray-100">
              {settings.bgImageDataUrl ? (
                <BackgroundImage src={settings.bgImageDataUrl} alt="Background" />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <div className="text-lg mb-2">No background set</div>
                    <div className="text-sm">Switch to Builder to upload a background image</div>
                  </div>
                </div>
              )}

              {hotspots.map((h, idx) => {
                const { left, top } = getHotspotContainerPosition(h);
                const solved = completed[idx];
                return (
                  <HotspotDot
                    key={h.id}
                    left={left}
                    top={top}
                    solved={solved}
                    mode="play"
                    onClick={() => openModalForHotspotIndex(idx)}
                  />
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
                      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-background text-primary p-6 rounded-lg shadow-xl">
                        <h3 className="text-lg font-semibold text-primary mb-2">No Puzzle Assigned</h3>
                        <p className="text-primary/70 mb-4">This hotspot is not linked to a puzzle. Return to Builder to assign one.</p>
                        <div className="text-right">
                          <button 
                            className="px-4 py-2 bg-hover text-primary/70 rounded-md hover:bg-shade transition-colors font-medium"
                            onClick={closeModal}
                          >
                            Close
                          </button>
                        </div>
                      </div>
                </>,
                document.body
              );
            }
            return <PuzzleModal puzzle={puzzle} open={modalOpen} onClose={closeModal} onSubmit={(ans) => {
              const ok = submitAnswerForHotspot(modalHotspotIndex!, ans);
              if (ok) {
                setSuccessPopup({ open: true, title: "Puzzle solved", message: "Got it right!" });
              }
              return ok;
            }} />;
          })()}
          {successPopup.open && createPortal(
            <>
              <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setSuccessPopup({ open: false })} />
              <div className="fixed left-1/2 top-1/2 z-60 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-background text-primary p-6 rounded-lg shadow-2xl">
                <h3 className="text-xl font-semibold mb-2">{successPopup.title ?? 'Success'}</h3>
                <p className="text-primary/70 mb-4">{successPopup.message}</p>
                <div className="text-right">
                  <button className="px-4 py-2 bg-emerald-600 text-white rounded" onClick={() => setSuccessPopup({ open: false })}>OK</button>
                </div>
              </div>
            </>, document.body
          )}
        </div>
      )}
    </main>
  );
}