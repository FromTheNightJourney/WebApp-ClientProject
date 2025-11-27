// "use client";

// import React, { useEffect, useRef, useState } from "react";
// import Image from "next/image";
// import { createPortal } from "react-dom";

// /**
//  * Escape Room Builder + Player (Same Page) — FIXED VERSION
//  * - Animated modal using React Portal (inputs no longer disappear)
//  * - MCQ + Short answer
//  * - Global timer
//  * - Persist puzzles + settings via localStorage
//  * - Reorder, edit, delete
//  * - Fully interactive Play Mode
//  */

// type PuzzleType = "short" | "mcq";

// type Puzzle = {
//   id: string;
//   type: PuzzleType;
//   question: string;
//   options: string[];
//   correctIndex: number | null;
//   expectedAnswer: string;
//   imageDataUrl?: string;
// };

// type PersistedSettings = {
//   globalMinutes: number;
// };

// const LS_PUZZLES = "escape:puzzles:v1";
// const LS_SETTINGS = "escape:settings:v1";

// const uid = () => Math.random().toString(36).slice(2, 9);

// // Move Modal out of the page component so it doesn't remount on every parent render.
// const Modal = ({
//   index,
//   open,
//   onClose,
//   p,
//   submitAnswer,
// }: {
//   index: number;
//   open: boolean;
//   onClose: () => void;
//   p: Puzzle;
//   submitAnswer: (i: number, answer: string | number) => boolean;
// }) => {
//   const textRef = useRef("");
//   const choiceRef = useRef<number | null>(null);
//   const [, force] = useState(0);
//   const update = () => force((x) => x + 1);

//   if (!p) return null;

//   return createPortal(
//     <>
//       <div
//         className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
//           open ? "opacity-100" : "opacity-0 pointer-events-none"
//         }`}
//         onClick={onClose}
//       />

//       <div
//         className={`fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 shadow-2xl transition-all duration-300 ${
//           open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
//         }`}
//         role="dialog"
//       >
//         <div className="flex justify-between items-start">
//           <div>
//             <h2 className="text-lg font-semibold">Question {index + 1}</h2>
//             <p className="text-sm text-gray-700 mt-2">{p.question}</p>
//             {p.imageDataUrl && (
//               <div className="mt-3 max-h-64 w-full rounded overflow-hidden">
//                 <Image
//                   src={p.imageDataUrl}
//                   alt={p.question || "Puzzle image"}
//                   className="object-contain w-full h-auto"
//                   width={800}
//                   height={450}
//                   unoptimized
//                 />
//               </div>
//             )}
//           </div>
//           <button onClick={onClose}>✕</button>
//         </div>

//         <div className="mt-4">
//           {p.type === "mcq" ? (
//             <div className="space-y-2">
//               {p.options.map((opt, oi) => (
//                 <label key={oi} className="flex items-center gap-2 p-2 border rounded">
//                   <input
//                     type="radio"
//                     name={`mcq-${p.id}`}
//                     checked={choiceRef.current === oi}
//                     onChange={() => {
//                       choiceRef.current = oi;
//                       update();
//                     }}
//                   />
//                   {opt}
//                 </label>
//               ))}
//             </div>
//           ) : (
//             <input
//               defaultValue={textRef.current}
//               onChange={(e) => (textRef.current = e.target.value)}
//               className="w-full p-2 border rounded"
//               placeholder="Type your answer..."
//             />
//           )}
//         </div>

//         <div className="mt-4 flex justify-end gap-2">
//           <button className="border px-3 py-1 rounded" onClick={onClose}>
//             Close
//           </button>
//           <button
//             className="bg-emerald-600 text-white px-3 py-1 rounded"
//             onClick={() => {
//               const ok = submitAnswer(index, p.type === "mcq" ? choiceRef.current ?? -1 : textRef.current);
//               if (ok) {
//                 alert("Correct!");
//                 onClose();
//               } else {
//                 alert("Incorrect — try again.");
//               }
//             }}
//           >
//             Submit
//           </button>
//         </div>
//       </div>
//     </>,
//     document.body
//   );
// };

// export default function EscapeRoomPage() {
//   // -------------------------
//   // Builder state
//   // -------------------------
//   const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
//   const [editingId, setEditingId] = useState<string | null>(null);

//   // Form fields
//   const [type, setType] = useState<PuzzleType>("short");
//   const [question, setQuestion] = useState("");
//   const [options, setOptions] = useState<string[]>(["", ""]);
//   const [correctIndex, setCorrectIndex] = useState<number | null>(0);
//   const [expectedAnswer, setExpectedAnswer] = useState("");
//   const [imageFileName, setImageFileName] = useState<string | null>(null);
//   const [previewImage, setPreviewImage] = useState<string | undefined>(undefined);
//   const imageInputRef = useRef<HTMLInputElement | null>(null);

//   // Settings
//   const [globalMinutes, setGlobalMinutes] = useState<number>(5);

//   // Mode: builder or play
//   const [mode, setMode] = useState<"builder" | "play">("builder");

//   // -------------------------
//   // Play Mode
//   // -------------------------
//   const [completed, setCompleted] = useState<boolean[]>([]);
//   const [timeLeft, setTimeLeft] = useState<number>(globalMinutes * 60);
//   const timerRef = useRef<number | null>(null);

//   // Modal state
//   const [modalIndex, setModalIndex] = useState<number | null>(null);
//   const [modalOpen, setModalOpen] = useState<boolean>(false);

//   // -------------------------
//   // Load persisted data
//   // -------------------------
//   useEffect(() => {
//     try {
//       const raw = localStorage.getItem(LS_PUZZLES);
//       if (raw) {
//         const parsed: Puzzle[] = JSON.parse(raw);
//         setPuzzles(parsed);
//       }
//     } catch {}

//     try {
//       const s = localStorage.getItem(LS_SETTINGS);
//       if (s) {
//         const parsed: PersistedSettings = JSON.parse(s);
//         if (parsed.globalMinutes) setGlobalMinutes(parsed.globalMinutes);
//       }
//     } catch {}
//   }, []);

//   // Keep completed array aligned
//   useEffect(() => {
//     setCompleted((prev) => {
//       const copy = [...prev];
//       while (copy.length < puzzles.length) copy.push(false);
//       if (copy.length > puzzles.length) copy.splice(puzzles.length);
//       return copy;
//     });
//   }, [puzzles.length]);

//   // Autosave
//   useEffect(() => {
//     try {
//       localStorage.setItem(LS_PUZZLES, JSON.stringify(puzzles));
//       localStorage.setItem(LS_SETTINGS, JSON.stringify({ globalMinutes }));
//     } catch {}
//   }, [puzzles, globalMinutes]);

//   // Timer management
//   useEffect(() => {
//     if (mode !== "play") return;

//     setTimeLeft(globalMinutes * 60);

//     if (timerRef.current) clearInterval(timerRef.current);
//     timerRef.current = window.setInterval(() => {
//       setTimeLeft((t) => {
//         if (t <= 1) {
//           clearInterval(timerRef.current!);
//           timerRef.current = null;
//           return 0;
//         }
//         return t - 1;
//       });
//     }, 1000);

//     return () => {
//       if (timerRef.current) clearInterval(timerRef.current);
//     };
//   }, [globalMinutes, mode]);

//   // -------------------------
//   // Helpers
//   // -------------------------
//   const resetForm = () => {
//     setType("short");
//     setQuestion("");
//     setOptions(["", ""]);
//     setCorrectIndex(0);
//     setExpectedAnswer("");
//     setImageFileName(null);
//     setPreviewImage(undefined);
//     if (imageInputRef.current) imageInputRef.current.value = "";
//     setEditingId(null);
//   };

//   const readImage = (file?: File): Promise<string | undefined> =>
//     new Promise((resolve) => {
//       if (!file) return resolve(undefined);
//       const r = new FileReader();
//       r.onload = () => resolve(typeof r.result === "string" ? r.result : undefined);
//       r.readAsDataURL(file);
//     });

//   // -------------------------
//   // Builder: add/update
//   // -------------------------
//   const addOrUpdatePuzzle = async () => {
//     if (!question.trim()) return alert("Question required");
//     if (type === "mcq") {
//       if (options.filter((o) => o.trim() !== "").length < 2) {
//         return alert("MCQ needs 2+ options");
//       }
//       if (correctIndex === null || !options[correctIndex]?.trim()) {
//         return alert("Select a correct option");
//       }
//     } else if (!expectedAnswer.trim()) {
//       return alert("Expected answer required");
//     }

//     let dataUrl: string | undefined = undefined;
//     if (imageInputRef.current?.files?.[0]) {
//       dataUrl = await readImage(imageInputRef.current.files[0]);
//     }

//     const newPuzzle: Puzzle = {
//       id: editingId ?? uid(),
//       type,
//       question: question.trim(),
//       options: type === "mcq" ? options.map((x) => x.trim()) : [""],
//       correctIndex: type === "mcq" ? correctIndex : null,
//       expectedAnswer: type === "short" ? expectedAnswer.trim() : "",
//       imageDataUrl: dataUrl,
//     };

//     if (editingId) {
//       setPuzzles((prev) => prev.map((p) => (p.id === editingId ? newPuzzle : p)));
//     } else {
//       setPuzzles((prev) => [...prev, newPuzzle]);
//     }
//     resetForm();
//   };

//   const startEditing = (id: string) => {
//     const p = puzzles.find((x) => x.id === id);
//     if (!p) return;

//     setEditingId(p.id);
//     setType(p.type);
//     setQuestion(p.question);
//     setPreviewImage(p.imageDataUrl ?? undefined);
//     setImageFileName(p.imageDataUrl ? "uploaded" : null);

//     if (p.type === "mcq") {
//       setOptions([...p.options]);
//       setCorrectIndex(p.correctIndex ?? 0);
//     } else {
//       setOptions(["", ""]);
//       setCorrectIndex(0);
//       setExpectedAnswer(p.expectedAnswer);
//     }
//   };

//   const deletePuzzle = (id: string) => {
//     if (!confirm("Delete puzzle?")) return;
//     setPuzzles((p) => p.filter((x) => x.id !== id));
//   };

//   const moveUp = (i: number) => {
//     if (i <= 0) return;
//     setPuzzles((p) => {
//       const copy = [...p];
//       [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
//       return copy;
//     });
//   };

//   const moveDown = (i: number) => {
//     setPuzzles((p) => {
//       const copy = [...p];
//       if (i >= copy.length - 1) return copy;
//       [copy[i], copy[i + 1]] = [copy[i + 1], copy[i]];
//       return copy;
//     });
//   };

//   // -------------------------
//   // Play Mode
//   // -------------------------
//   const openModal = (index: number) => {
//     if (timeLeft <= 0) return;
//     setModalIndex(index);
//     setModalOpen(true);
//   };

//   const closeModal = () => {
//     setModalOpen(false);
//     setTimeout(() => setModalIndex(null), 300);
//   };

//   const submitAnswer = (i: number, answer: string | number) => {
//     const p = puzzles[i];
//     if (!p) return false;

//     if (p.type === "mcq") {
//       if (Number(answer) === p.correctIndex) {
//         setCompleted((c) => {
//           const copy = [...c];
//           copy[i] = true;
//           return copy;
//         });
//         return true;
//       }
//       return false;
//     } else {
//       const a = String(answer || "").trim().toLowerCase();
//       const e = (p.expectedAnswer || "").trim().toLowerCase();
//       if (a === e) {
//         setCompleted((c) => {
//           const copy = [...c];
//           copy[i] = true;
//           return copy;
//         });
//         return true;
//       }
//       return false;
//     }
//   };

//   const allComplete = completed.length > 0 && completed.every(Boolean);
//   const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

//   // -------------------------
//   // Modal moved to top-level to avoid remounting on parent re-renders.

//   // -------------------------
//   // RENDER
//   // -------------------------
//   return (
//     <main className="p-8">
//       <h1 className="text-2xl font-bold">Escape Room — Builder & Player</h1>

//       {/* BUILDER MODE */}
//       {mode === "builder" && (
//         <>
//           <section className="mt-4 p-4 border rounded">
//             <div className="flex items-center gap-4">
//               <label className="flex items-center gap-2">
//                 <span className="text-sm">Global timer (minutes)</span>
//                 <input
//                   type="number"
//                   min={1}
//                   value={globalMinutes}
//                   onChange={(e) => setGlobalMinutes(Math.max(1, Number(e.target.value)))}
//                   className="w-20 p-2 border rounded ml-2"
//                 />
//               </label>

//               <div className="ml-auto flex gap-2">
//                 <button
//                   className="px-3 py-2 rounded bg-emerald-600 text-white"
//                   onClick={() => setMode("play")}
//                 >
//                   Start Escape Room
//                 </button>

//                 <button
//                   className="px-3 py-2 rounded bg-gray-200"
//                   onClick={() => {
//                     if (!confirm("Clear all puzzles?")) return;
//                     setPuzzles([]);
//                     setGlobalMinutes(5);
//                     localStorage.removeItem(LS_PUZZLES);
//                     localStorage.removeItem(LS_SETTINGS);
//                   }}
//                 >
//                   Clear All
//                 </button>
//               </div>
//             </div>
//           </section>

//           {/* Builder layout */}
//           <section className="mt-4 grid md:grid-cols-3 gap-4">
//             {/* Puzzle list */}
//             <aside className="md:col-span-1 p-3 border rounded">
//               <h2 className="font-semibold">Puzzles ({puzzles.length})</h2>
//               <ul className="mt-3 space-y-2">
//                 {puzzles.map((p, i) => (
//                   <li key={p.id} className="p-2 border rounded">
//                     <div className="flex justify-between items-start">
//                       <div>
//                         <div className="font-medium">{i + 1}. {p.question}</div>
//                         <div className="text-sm text-gray-500">{p.type === "mcq" ? "MCQ" : "Short answer"}</div>
//                       </div>

//                       <div className="flex flex-col gap-1 ml-3">
//                         <button className="text-sm p-1" onClick={() => moveUp(i)}>↑</button>
//                         <button className="text-sm p-1" onClick={() => moveDown(i)}>↓</button>
//                         <button className="text-sm p-1" onClick={() => startEditing(p.id)}>✎</button>
//                         <button className="text-sm p-1 text-red-600" onClick={() => deletePuzzle(p.id)}>🗑</button>
//                       </div>
//                     </div>
//                   </li>
//                 ))}
//               </ul>
//             </aside>

//             {/* Form */}
//             <div className="md:col-span-2 p-4 border rounded">
//               <h3 className="font-medium">{editingId ? "Edit Puzzle" : "Create Puzzle"}</h3>

//               <div className="mt-3 space-y-4">
//                 <label className="block">
//                   <span className="text-sm font-medium">Type    </span>
//                   <select
//                     value={type}
//                     onChange={(e) => setType(e.target.value as PuzzleType)}
//                     className="mt-1 p-2 border rounded"
//                   >
//                     <option value="short">Short answer</option>
//                     <option value="mcq">Multiple choice</option>
//                   </select>
//                 </label>

//                 <label className="block">
//                   <span className="text-sm font-medium">Question</span>
//                   <input
//                     value={question}
//                     onChange={(e) => setQuestion(e.target.value)}
//                     className="w-full mt-1 p-2 border rounded"
//                   />
//                 </label>

//                 {type === "mcq" && (
//                   <div>
//                     <span className="text-sm font-medium">Options</span>
//                     <div className="mt-2 space-y-2">
//                       {options.map((opt, idx) => (
//                         <div key={idx} className="flex gap-2 items-center">
//                           <input
//                             value={opt}
//                             onChange={(e) =>
//                               setOptions((o) => {
//                                 const c = [...o];
//                                 c[idx] = e.target.value;
//                                 return c;
//                               })
//                             }
//                             className="flex-1 p-2 border rounded"
//                             placeholder={`Option ${idx + 1}`}
//                           />
//                           <label className="text-sm flex items-center gap-1">
//                             <input
//                               type="radio"
//                               name="correct"
//                               checked={correctIndex === idx}
//                               onChange={() => setCorrectIndex(idx)}
//                             />
//                             correct
//                           </label>
//                           <button onClick={() => setOptions((o) => o.filter((_, i) => i !== idx))}>✖</button>
//                         </div>
//                       ))}
//                     </div>

//                     <button className="mt-2 border px-3 py-1 rounded" onClick={() => setOptions((o) => [...o, ""])}>
//                       Add option
//                     </button>
//                   </div>
//                 )}

//                 {type === "short" && (
//                   <label className="block">
//                     <span className="text-sm font-medium">Expected answer</span>
//                     <input
//                       value={expectedAnswer}
//                       onChange={(e) => setExpectedAnswer(e.target.value)}
//                       className="w-full mt-1 p-2 border rounded"
//                     />
//                   </label>
//                 )}

//                 <label className="block">
//                   <span className="text-sm font-medium">Optional image</span>
//                   <input
//                     ref={imageInputRef}
//                     type="file"
//                     accept="image/*"
//                     className="mt-1"
//                     onChange={(e) => {
//                       const f = e.target.files?.[0];
//                       if (f) {
//                         setImageFileName(f.name);
//                         const fr = new FileReader();
//                         fr.onload = () => setPreviewImage(typeof fr.result === "string" ? fr.result : undefined);
//                         fr.readAsDataURL(f);
//                       } else {
//                         setImageFileName(null);
//                         setPreviewImage(undefined);
//                       }
//                     }}
//                   />
//                   {imageFileName && <p className="text-sm text-gray-600 mt-1">Selected: {imageFileName}</p>}
//                   {previewImage && (
//                     <div className="mt-2 max-h-48 rounded overflow-hidden">
//                       <Image src={previewImage} alt="Preview" className="object-contain w-full h-auto" width={400} height={300} unoptimized />
//                     </div>
//                   )}
//                 </label>

//                 <div className="flex gap-2">
//                   <button onClick={addOrUpdatePuzzle} className="px-3 py-1 rounded bg-blue-600 text-white">
//                     {editingId ? "Save changes" : "Add puzzle"}
//                   </button>
//                   <button onClick={resetForm} className="px-3 py-1 rounded bg-gray-300">Reset</button>
//                 </div>
//               </div>
//             </div>
//           </section>
//         </>
//       )}

//       {/* PLAY MODE */}
//       {mode === "play" && (
//         <>
//           <section className="mt-4 p-4 border rounded flex justify-between items-center">
//             <div>
//               <span className="text-sm text-gray-700">Timer:</span>{" "}
//               <span className="font-mono text-xl">{fmt(timeLeft)}</span>
//             </div>

//             <div className="flex gap-2">
//               <button className="border px-3 py-1 rounded" onClick={() => setMode("builder")}>
//                 Back to Builder
//               </button>
//               <button
//                 className="px-3 py-1 rounded bg-yellow-500"
//                 onClick={() => {
//                   if (confirm("Restart escape room?")) {
//                     setTimeLeft(globalMinutes * 60);
//                     setCompleted((c) => c.map(() => false));
//                   }
//                 }}
//               >
//                 Restart
//               </button>
//             </div>
//           </section>

//           <section className="mt-4 grid md:grid-cols-3 gap-4">
//             {/* Timeline */}
//             <aside className="md:col-span-1 p-3 border rounded">
//               <h2 className="font-semibold">Timeline</h2>
//               <div className="mt-3 space-y-4">
//                 {puzzles.map((p, i) => (
//                   <div key={p.id} className="flex items-start gap-3">
//                     <button
//                       onClick={() => openModal(i)}
//                       disabled={timeLeft <= 0}
//                       className={`h-10 w-10 rounded-full border-2 flex items-center justify-center ${
//                         completed[i]
//                           ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none"
//                           : "bg-white"
//                       }`}
//                     >
//                       {i + 1}
//                     </button>
//                     <div>
//                       <div className="font-medium">{p.question}</div>
//                       <div className="text-sm text-gray-500">{p.type === "mcq" ? "MCQ" : "Short answer"}</div>
//                     </div>
//                     {completed[i] && <div className="ml-auto text-green-600">✔</div>}
//                   </div>
//                 ))}
//               </div>
//             </aside>

//             {/* Middle panel */}
//             <div className="md:col-span-2 p-4 border rounded flex flex-col items-center justify-center">
//               {timeLeft <= 0 ? (
//                 <>
//                   <h3 className="text-xl font-bold">Your time is up!</h3>
//                   <p className="mt-2 text-gray-600">You ran out of time.</p>
//                 </>
//               ) : allComplete ? (
//                 <>
//                   <h3 className="text-xl font-bold">You escaped! 🎉</h3>
//                   <p className="mt-2 text-gray-600">All puzzles complete!</p>
//                 </>
//               ) : (
//                 <>
//                   <h3 className="text-lg font-semibold">Escape in progress</h3>
//                   <p className="mt-2 text-gray-600 text-center">
//                     Select a puzzle from the timeline. Solve them all before time runs out!
//                   </p>
//                 </>
//               )}
//             </div>
//           </section>

//           {/* Portal modal */}
//           {modalIndex !== null && (
//             <Modal
//               index={modalIndex}
//               open={modalOpen}
//               onClose={closeModal}
//               p={puzzles[modalIndex]}
//               submitAnswer={submitAnswer}
//             />
//           )}
//         </>
//       )}
//     </main>
//   );
// }
