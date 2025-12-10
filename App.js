import React, { useState, useEffect } from "react";
import { Copy, Trash2, Search, Plus, Image as ImageIcon } from "lucide-react";

const LOCAL_STORAGE_KEY = "promptVault_v1";

function App() {
  const [prompts, setPrompts] = useState([]);
  const [title, setTitle] = useState("");
  const [model, setModel] = useState("");
  const [tags, setTags] = useState("");
  const [promptText, setPromptText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  // Load from localStorage on first load
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (Array.isArray(data)) {
          setPrompts(data);
        }
      }
    } catch (err) {
      console.error("Error loading prompts", err);
    }
  }, []);

  // Save to localStorage whenever prompts change
  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(prompts));
    } catch (err) {
      console.error("Error saving prompts", err);
    }
  }, [prompts]);

  function handleAddPrompt(e) {
    e.preventDefault();
    if (!promptText.trim()) return;

    const newPrompt = {
      id: Date.now(),
      title: title.trim() || "Untitled Prompt",
      model: model.trim(),
      tags: tags.trim(),
      promptText: promptText.trim(),
      imageUrl: imageUrl.trim(),
      createdAt: new Date().toISOString()
    };

    setPrompts([newPrompt, ...prompts]);
    setTitle("");
    setModel("");
    setTags("");
    setPromptText("");
    setImageUrl("");
  }

  function handleDeletePrompt(id) {
    if (!window.confirm("Delete this prompt?")) return;
    setPrompts(prompts.filter((p) => p.id !== id));
  }

  async function handleCopyPrompt(prompt) {
    const textToCopy = prompt.promptText;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedId(prompt.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.error("Copy failed", err);
      alert("Could not copy the prompt.");
    }
  }

  const filteredPrompts = prompts.filter((p) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      p.title.toLowerCase().includes(q) ||
      p.model.toLowerCase().includes(q) ||
      p.tags.toLowerCase().includes(q) ||
      p.promptText.toLowerCase().includes(q)
    );
  });

  const h = React.createElement; // small helper

  return h(
    "div",
    { className: "min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white" },
    // Container
    h(
      "div",
      { className: "max-w-5xl mx-auto px-4 py-6 sm:py-10" },

      // Header
      h(
        "header",
        { className: "mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" },
        h(
          "div",
          null,
          h(
            "h1",
            { className: "font-display text-3xl sm:text-4xl font-semibold tracking-tight" },
            "PromptVault"
          ),
          h(
            "p",
            { className: "text-sm sm:text-base text-zinc-400 mt-1" },
            "Store your best AI image prompts with one-click copy. Works on phone and desktop."
          )
        ),
        h(
          "div",
          { className: "flex items-center gap-2 text-xs sm:text-sm text-zinc-400" },
          h("span", { className: "px-2 py-1 rounded-full bg-zinc-900/80 border border-zinc-700/40" }, "Local only"),
          h("span", { className: "px-2 py-1 rounded-full bg-zinc-900/80 border border-zinc-700/40" }, "Unlimited free")
        )
      ),

      // Search
      h(
        "div",
        { className: "mb-6" },
        h(
          "div",
          { className: "relative" },
          h("input", {
            className:
              "w-full glass-input rounded-2xl px-10 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/60 placeholder:text-zinc-500",
            placeholder: "Search by title, model, tag or prompt text...",
            value: search,
            onChange: (e) => setSearch(e.target.value)
          }),
          h(
            "span",
            { className: "absolute inset-y-0 left-3 flex items-center pointer-events-none" },
            h(Search, { size: 18, className: "text-zinc-500" })
          )
        )
      ),

      // Main layout
      h(
        "div",
        { className: "grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start" },

        // Left: Prompt list
        h(
          "section",
          { className: "space-y-3" },
          h(
            "div",
            { className: "flex items-center justify-between mb-1" },
            h(
              "h2",
              { className: "font-display text-lg sm:text-xl font-medium" },
              "Saved Prompts"
            ),
            h(
              "span",
              { className: "text-xs text-zinc-500" },
              filteredPrompts.length,
              filteredPrompts.length === 1 ? " item" : " items"
            )
          ),
          filteredPrompts.length === 0
            ? h(
                "div",
                { className: "glass-panel rounded-2xl p-6 text-sm text-zinc-400 border border-dashed border-zinc-700/60" },
                "No prompts yet. Add your first one on the right."
              )
            : h(
                "div",
                {
                  className:
                    "space-y-3 max-h-[70vh] overflow-y-auto no-scrollbar pr-1"
                },
                filteredPrompts.map((prompt) =>
                  h(
                    "article",
                    {
                      key: prompt.id,
                      className:
                        "glass-panel rounded-2xl p-4 sm:p-5 transition hover:border-indigo-500/50 hover:-translate-y-[1px]"
                    },
                    // Top row
                    h(
                      "div",
                      { className: "flex items-start justify-between gap-3 mb-2" },
                      h(
                        "div",
                        { className: "space-y-1" },
                        h(
                          "h3",
                          { className: "font-medium text-sm sm:text-base" },
                          prompt.title
                        ),
                        h(
                          "div",
                          { className: "flex flex-wrap gap-1.5 text-[11px] text-zinc-400" },
                          prompt.model &&
                            h(
                              "span",
                              {
                                className:
                                  "px-2 py-0.5 rounded-full bg-zinc-900/80 border border-zinc-700/50"
                              },
                              prompt.model
                            ),
                          prompt.tags &&
                            h(
                              "span",
                              {
                                className:
                                  "px-2 py-0.5 rounded-full bg-zinc-900/80 border border-zinc-700/50"
                              },
                              prompt.tags
                            )
                        )
                      ),
                      h(
                        "div",
                        { className: "flex items-center gap-1.5" },
                        h(
                          "button",
                          {
                            onClick: () => handleCopyPrompt(prompt),
                            className:
                              "inline-flex items-center gap-1 rounded-full border border-zinc-700/60 bg-zinc-900/70 px-3 py-1.5 text-[11px] font-medium tracking-tight hover:border-indigo-500/70 hover:bg-zinc-900/90 active:scale-[0.97] transition",
                            type: "button"
                          },
                          h(Copy, {
                            size: 14,
                            className:
                              copiedId === prompt.id ? "text-emerald-400" : "text-zinc-300"
                          }),
                          copiedId === prompt.id ? "Copied" : "Copy"
                        ),
                        h(
                          "button",
                          {
                            onClick: () => handleDeletePrompt(prompt.id),
                            className:
                              "inline-flex items-center justify-center rounded-full border border-transparent bg-zinc-900/70 p-1.5 hover:border-red-500/70 hover:bg-red-950/40 transition",
                            type: "button"
                          },
                          h(Trash2, { size: 14, className: "text-zinc-400" })
                        )
                      )
                    ),

                    // Prompt text
                    h(
                      "pre",
                      {
                        className:
                          "mt-2 whitespace-pre-wrap break-words text-xs sm:text-sm text-zinc-100 bg-black/40 rounded-xl px-3 py-2.5 border border-zinc-800/70"
                      },
                      prompt.promptText
                    ),

                    // Bottom
                    h(
                      "div",
                      { className: "mt-3 flex items-center justify-between text-[11px] text-zinc-500" },
                      h(
                        "div",
                        { className: "flex items-center gap-1.5" },
                        prompt.imageUrl &&
                          h(
                            "a",
                            {
                              href: prompt.imageUrl,
                              target: "_blank",
                              rel: "noreferrer",
                              className:
                                "inline-flex items-center gap-1 rounded-full border border-zinc-700/60 px-2 py-0.5 hover:border-indigo-500/70 hover:text-indigo-300 transition"
                            },
                            h(ImageIcon, { size: 12 }),
                            "Ref image"
                          )
                      ),
                      h(
                        "span",
                        null,
                        new Date(prompt.createdAt).toLocaleString()
                      )
                    )
                  )
                )
              )
        ),

        // Right: Add prompt form
        h(
          "section",
          null,
          h(
            "div",
            { className: "glass-panel rounded-2xl p-4 sm:p-5" },
            h(
              "div",
              { className: "flex items-center justify-between mb-3" },
              h(
                "h2",
                { className: "font-display text-lg font-medium" },
                "Add Prompt"
              ),
              h(
                "span",
                {
                  className:
                    "inline-flex items-center gap-1 rounded-full bg-indigo-500/15 border border-indigo-500/40 px-2 py-1 text-[11px] text-indigo-200"
                },
                h(Plus, { size: 12 }),
                "New"
              )
            ),

            h(
              "form",
              { className: "space-y-3", onSubmit: handleAddPrompt },

              // Title
              h(
                "div",
                { className: "space-y-1" },
                h(
                  "label",
                  { className: "text-xs text-zinc-400" },
                  "Prompt Title"
                ),
                h("input", {
                  className:
                    "glass-input w-full rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/70 placeholder:text-zinc-500",
                  placeholder: "e.g. NewJeans Danielle at Taj Mahal 4K",
                  value: title,
                  onChange: (e) => setTitle(e.target.value)
                })
              ),

              // Model + Tags
              h(
                "div",
                { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" },
                h(
                  "div",
                  { className: "space-y-1" },
                  h(
                    "label",
                    { className: "text-xs text-zinc-400" },
                    "Model / Tool"
                  ),
                  h("input", {
                    className:
                      "glass-input w-full rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/70 placeholder:text-zinc-500",
                    placeholder: "e.g. NanoBananaPro, Midjourney, Flux",
                    value: model,
                    onChange: (e) => setModel(e.target.value)
                  })
                ),
                h(
                  "div",
                  { className: "space-y-1" },
                  h(
                    "label",
                    { className: "text-xs text-zinc-400" },
                    "Tags"
                  ),
                  h("input", {
                    className:
                      "glass-input w-full rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/70 placeholder:text-zinc-500",
                    placeholder: "e.g. y2k, kpop, selfie, 4k",
                    value: tags,
                    onChange: (e) => setTags(e.target.value)
                  })
                )
              ),

              // Image URL
              h(
                "div",
                { className: "space-y-1" },
                h(
                  "label",
                  { className: "text-xs text-zinc-400" },
                  "Reference Image URL (optional)"
                ),
                h("input", {
                  className:
                    "glass-input w-full rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/70 placeholder:text-zinc-500",
                  placeholder: "https://...",
                  value: imageUrl,
                  onChange: (e) => setImageUrl(e.target.value)
                })
              ),

              // Prompt textarea
              h(
                "div",
                { className: "space-y-1" },
                h(
                  "label",
                  { className: "text-xs text-zinc-400" },
                  "Full Prompt"
                ),
                h("textarea", {
                  className:
                    "glass-input w-full rounded-2xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/70 placeholder:text-zinc-500 min-h-[120px] resize-y",
                  placeholder:
                    "Paste your full image prompt here...",
                  value: promptText,
                  onChange: (e) => setPromptText(e.target.value)
                })
              ),

              // Submit button
              h(
                "div",
                { className: "pt-1 flex justify-end" },
                h(
                  "button",
                  {
                    type: "submit",
                    className:
                      "inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-4 py-2.5 text-sm font-medium tracking-tight shadow-lg shadow-indigo-500/30 hover:bg-indigo-400 active:scale-[0.97] transition disabled:opacity-50 disabled:cursor-not-allowed",
                    disabled: !promptText.trim()
                  },
                  h(Plus, { size: 16 }),
                  "Save Prompt"
                )
              )
            )
          )
        )
      )
    )
  );
}

export default App;
