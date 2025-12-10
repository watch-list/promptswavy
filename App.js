import React, { useState, useEffect } from "react";
import { Copy, Trash2, Plus } from "lucide-react";

const LOCAL_STORAGE_KEY = "promptVault_v1";

function App() {
  const [prompts, setPrompts] = useState([]);
  const [title, setTitle] = useState("");
  const [promptText, setPromptText] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  // Load saved prompts once
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setPrompts(parsed);
      }
    } catch (e) {
      console.error("Failed to load prompts", e);
    }
  }, []);

  // Save whenever prompts change
  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(prompts));
    } catch (e) {
      console.error("Failed to save prompts", e);
    }
  }, [prompts]);

  function handleAddPrompt(e) {
    e.preventDefault();
    if (!promptText.trim()) return;

    const newPrompt = {
      id: Date.now(),
      title: title.trim() || "Untitled prompt",
      text: promptText.trim()
    };

    setPrompts([newPrompt, ...prompts]);
    setTitle("");
    setPromptText("");
  }

  function handleDeletePrompt(id) {
    if (!window.confirm("Delete this prompt?")) return;
    setPrompts(prompts.filter((p) => p.id !== id));
  }

  async function handleCopy(p) {
    try {
      const text = p.text;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        document.body.removeChild(area);
      }
      setCopiedId(p.id);
      setTimeout(() => setCopiedId(null), 1200);
    } catch (e) {
      console.error("Copy failed", e);
      alert("Copy failed");
    }
  }

  const h = React.createElement;

  return h(
    "div",
    {
      className:
        "min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white flex items-center justify-center px-4 py-8"
    },
    h(
      "div",
      {
        className:
          "glass-panel max-w-3xl w-full rounded-3xl border border-white/10 px-5 py-6 sm:px-7 sm:py-8"
      },

      // Header
      h(
        "div",
        { className: "mb-5 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between" },
        h(
          "div",
          null,
          h(
            "h1",
            { className: "font-display text-2xl sm:text-3xl font-semibold tracking-tight" },
            "PromptVault"
          ),
          h(
            "p",
            { className: "text-xs sm:text-sm text-zinc-400 mt-1" },
            "Save your favourite AI prompts and copy them in one click."
          )
        ),
        h(
          "div",
          { className: "text-[11px] text-zinc-500 flex gap-1 sm:gap-2 mt-2 sm:mt-0" },
          h(
            "span",
            {
              className:
                "px-2 py-1 rounded-full bg-zinc-900/80 border border-zinc-700/60"
            },
            "Local only"
          ),
          h(
            "span",
            {
              className:
                "px-2 py-1 rounded-full bg-zinc-900/80 border border-zinc-700/60"
            },
            "Works on phone"
          )
        )
      ),

      // Form
      h(
        "form",
        { onSubmit: handleAddPrompt, className: "space-y-3 mb-5" },
        h(
          "div",
          { className: "space-y-1" },
          h(
            "label",
            { className: "text-xs text-zinc-400" },
            "Prompt title"
          ),
          h("input", {
            className:
              "glass-input w-full rounded-2xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/70 placeholder:text-zinc-500",
            placeholder: "e.g. Danielle NewJeans selfie at Taj Mahal",
            value: title,
            onChange: (e) => setTitle(e.target.value)
          })
        ),
        h(
          "div",
          { className: "space-y-1" },
          h(
            "label",
            { className: "text-xs text-zinc-400" },
            "Full prompt"
          ),
          h("textarea", {
            className:
              "glass-input w-full rounded-2xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/70 placeholder:text-zinc-500 min-h-[110px] resize-y",
            placeholder: "Paste your full prompt here…",
            value: promptText,
            onChange: (e) => setPromptText(e.target.value)
          })
        ),
        h(
          "div",
          { className: "flex justify-end pt-1" },
          h(
            "button",
            {
              type: "submit",
              disabled: !promptText.trim(),
              className:
                "inline-flex items-center gap-1.5 rounded-2xl bg-indigo-500 px-4 py-2 text-sm font-medium tracking-tight shadow-lg shadow-indigo-500/30 hover:bg-indigo-400 active:scale-[0.97] transition disabled:opacity-50 disabled:cursor-not-allowed"
            },
            h(Plus, { size: 16 }),
            "Save"
          )
        )
      ),

      // Divider
      h("div", {
        className: "h-px bg-gradient-to-r from-transparent via-zinc-700/60 to-transparent mb-4"
      }),

      // Saved list
      prompts.length === 0
        ? h(
            "div",
            {
              className:
                "text-xs sm:text-sm text-zinc-500 text-center py-4"
            },
            "No prompts saved yet. Add your first one above."
          )
        : h(
            "div",
            {
              className:
                "space-y-3 max-h-72 overflow-y-auto no-scrollbar pr-1"
            },
            prompts.map((p) =>
              h(
                "div",
                {
                  key: p.id,
                  className:
                    "glass-panel rounded-2xl px-3.5 py-3 border border-zinc-700/70"
                },
                h(
                  "div",
                  { className: "flex items-start justify-between gap-2 mb-1.5" },
                  h(
                    "h2",
                    { className: "font-medium text-sm truncate max-w-[70%]" },
                    p.title
                  ),
                  h(
                    "div",
                    { className: "flex items-center gap-1.5" },
                    h(
                      "button",
                      {
                        type: "button",
                        onClick: () => handleCopy(p),
                        className:
                          "inline-flex items-center gap-1 rounded-full border border-zinc-700/60 bg-zinc-900/80 px-2.5 py-1 text-[11px] hover:border-indigo-400/70 hover:bg-zinc-900/90 active:scale-[0.97] transition"
                      },
                      h(Copy, {
                        size: 13,
                        className:
                          copiedId === p.id
                            ? "text-emerald-400"
                            : "text-zinc-200"
