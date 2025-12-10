import React, { useState, useEffect } from "react";
import { Plus, Search, Sparkles, Copy, Share2 } from "lucide-react";

const STORAGE_KEY = "promptVault_prompts_v2";

// ---------- Storage Helpers ----------
function getPromptsFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("Failed to load prompts", e);
    return [];
  }
}

function setPromptsInStorage(prompts) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
  } catch (e) {
    console.error("Failed to save prompts", e);
  }
}

function savePromptToStorage(newPrompt) {
  const all = getPromptsFromStorage();
  const idx = all.findIndex((p) => p.id === newPrompt.id);
  if (idx >= 0) {
    all[idx] = newPrompt;
  } else {
    all.unshift(newPrompt);
  }
  setPromptsInStorage(all);
}

// ---------- Share Helpers ----------
function encodeShareData(data) {
  try {
    const json = JSON.stringify(data);
    const utf8 = encodeURIComponent(json);
    return btoa(utf8);
  } catch (e) {
    console.error("encodeShareData failed", e);
    return "";
  }
}

function decodeShareData(encoded) {
  try {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json);
  } catch (e) {
    console.error("Invalid share data", e);
    return null;
  }
}

// ---------- Clipboard ----------
async function copyToClipboard(text) {
  try {
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
    return true;
  } catch (e) {
    console.error("Copy failed", e);
    alert("Copy failed");
    return false;
  }
}

function App() {
  const [view, setView] = useState("gallery"); // 'gallery' | 'full' | 'shared'
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [sharedData, setSharedData] = useState(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);

  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = ["All", "NanoBanana", "Midjourney", "Seedream"];
  const h = React.createElement;

  // ---------- Hash routing & initial load ----------
  useEffect(() => {
    function loadData() {
      setPrompts(getPromptsFromStorage());
    }

    function handleHashChange() {
      const hash = window.location.hash || "";

      if (hash.startsWith("#/share/")) {
        const encoded = hash.split("#/share/")[1];
        const decoded = decodeShareData(encoded);
        if (decoded) {
          setSharedData(decoded);
          setView("shared");
        } else {
          window.location.hash = "";
        }
      } else if (hash.startsWith("#/view/")) {
        const id = hash.split("#/view/")[1];
        const all = getPromptsFromStorage();
        setPrompts(all);
        const found = all.find((p) => String(p.id) === String(id));
        if (found) {
          setSelectedPrompt(found);
          setView("full");
        } else {
          window.location.hash = "";
          setView("gallery");
          setSelectedPrompt(null);
          setSharedData(null);
          loadData();
        }
      } else {
        setView("gallery");
        setSelectedPrompt(null);
        setSharedData(null);
        loadData();
      }
    }

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // ---------- Actions ----------
  function handleSavePrompt(data) {
    const id = data.id || String(Date.now());
    const category = data.category || "NanoBanana";

    const newPrompt = {
      id,
      title: data.title || "Untitled Prompt",
      prompt: data.prompt || "",
      category,
      imageUrl: data.imageUrl || ""
    };

    savePromptToStorage(newPrompt);
    const updated = getPromptsFromStorage();
    setPrompts(updated);

    if (selectedPrompt && String(selectedPrompt.id) === String(newPrompt.id)) {
      setSelectedPrompt(newPrompt);
    }

    setIsAddModalOpen(false);
    setEditingPrompt(null);
  }

  function openAddModal() {
    setEditingPrompt(null);
    setIsAddModalOpen(true);
  }

  function openEditModal(prompt) {
    setEditingPrompt(prompt);
    setIsAddModalOpen(true);
  }

  function openPrompt(prompt) {
    window.location.hash = `#/view/${prompt.id}`;
  }

  function closeFullView() {
    window.location.hash = "";
  }

  function deletePrompt(id) {
    const filtered = prompts.filter((p) => String(p.id) !== String(id));
    setPrompts(filtered);
    setPromptsInStorage(filtered);
    if (selectedPrompt && String(selectedPrompt.id) === String(id)) {
      closeFullView();
    }
  }

  async function sharePromptLink(data) {
    const payload = {
      title: data.title || "",
      prompt: data.prompt || "",
      category: data.category || "",
      imageUrl: data.imageUrl || ""
    };
    const encoded = encodeShareData(payload);
    if (!encoded) return;
    const url = `${window.location.origin}${window.location.pathname}#/share/${encoded}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      alert("Share link copied to clipboard!");
    }
  }

  async function copyPromptText(data) {
    if (!data || !data.prompt) return;
    await copyToClipboard(data.prompt);
  }

  // ---------- Filters ----------
  const filteredPrompts = prompts.filter((p) => {
    const matchesCategory =
      activeCategory === "All" ||
      (p.category || "NanoBanana") === activeCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      q === "" ||
      (p.title || "").toLowerCase().includes(q) ||
      (p.prompt || "").toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  // ---------- UI Pieces ----------
  function renderPromptCard(prompt) {
    const hasImage = !!prompt.imageUrl;
    return h(
      "div",
      {
        key: prompt.id,
        onClick: () => openPrompt(prompt), // 🔥 whole card clickable
        className:
          "relative group rounded-3xl bg-white/5 border border-white/10 overflow-hidden flex flex-col cursor-pointer hover:bg-white/7 hover:border-white/20 transition-all duration-300"
      },
      hasImage &&
        h(
          "div",
          {
            className:
              "w-full bg-black aspect-[4/5] overflow-hidden"
          },
          h("img", {
            src: prompt.imageUrl,
            alt: prompt.title || "Prompt image",
            className: "w-full h-full object-cover"
          })
        ),
      h(
        "div",
        {
          className:
            "p-4 flex-1 flex flex-col"
        },
        h(
          "div",
          { className: "flex items-start justify-between gap-2 mb-3" },
          h(
            "h2",
            {
              className:
                "font-display text-sm md:text-base font-semibold tracking-tight line-clamp-2"
            },
            prompt.title || "Untitled Prompt"
          ),
          h(
            "span",
            {
              className:
                "text-[10px] uppercase tracking-widest bg-white/10 text-white/60 px-2 py-1 rounded-full"
            },
            prompt.category || "NanoBanana"
          )
        ),
        h(
          "p",
          {
            className:
              "text-[11px] md:text-xs text-white/60 line-clamp-3 leading-snug mb-3"
          },
          prompt.prompt || ""
        ),
        h(
          "div",
          { className: "mt-auto flex items-center justify-between pt-1" },
          h(
            "span",
            {
              className:
                "text-[11px] font-bold uppercase tracking-widest text-white/35"
            },
            "Open"
          ),
          h(
            "button",
            {
              type: "button",
              onClick: (e) => {
                e.stopPropagation(); // 🔥 don’t open card when clicking edit
                openEditModal(prompt);
              },
              className:
                "text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white/80 transition-colors"
            },
            "Edit"
          )
        )
      )
    );
  }

  function renderAddModal() {
    if (!isAddModalOpen) return null;

    const initialTitle = editingPrompt ? editingPrompt.title || "" : "";
    const initialCategory = editingPrompt ? editingPrompt.category || "NanoBanana" : "NanoBanana";
    const initialPrompt = editingPrompt ? editingPrompt.prompt || "" : "";
    const initialImageUrl = editingPrompt ? editingPrompt.imageUrl || "" : "";

    let titleValue = initialTitle;
    let categoryValue = initialCategory;
    let promptValue = initialPrompt;
    let imageUrlValue = initialImageUrl;

    function onSubmit(e) {
      e.preventDefault();
      if (!promptValue.trim()) return;
      handleSavePrompt({
        id: editingPrompt ? editingPrompt.id : undefined,
        title: titleValue.trim(),
        prompt: promptValue.trim(),
        category: categoryValue.trim() || "NanoBanana",
        imageUrl: imageUrlValue.trim()
      });
    }

    return h(
      "div",
      {
        className:
          "fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      },
      h(
        "div",
          {
            className:
              "max-w-md w-full rounded-3xl bg-[#050505] border border-white/10 p-5 md:p-6 shadow-[0_0_40px_rgba(0,0,0,0.7)]"
          },
        h(
          "div",
          { className: "flex items-center justify-between mb-4" },
          h(
            "h2",
            { className: "font-display text-lg font-semibold" },
            editingPrompt ? "Edit Prompt" : "Add Prompt"
          ),
          h(
            "button",
            {
              type: "button",
              onClick: () => {
                setIsAddModalOpen(false);
                setEditingPrompt(null);
              },
              className:
                "text-xs uppercase tracking-widest text-white/40 hover:text-white/80"
            },
            "Close"
          )
        ),
        h(
          "form",
          { className: "space-y-3", onSubmit },
          h(
            "div",
            { className: "space-y-1" },
            h(
              "label",
              { className: "text-xs text-white/50" },
              "Title"
            ),
            h("input", {
              defaultValue: initialTitle,
              onChange: (e) => (titleValue = e.target.value),
              placeholder: "e.g. Harry Potter Style",
              className:
                "w-full glass-input rounded-2xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5C5CFF]/70 placeholder:text-white/30"
            })
          ),
          h(
            "div",
            { className: "space-y-1" },
            h(
              "label",
              { className: "text-xs text-white/50" },
              "Category"
            ),
            h(
              "select",
              {
                defaultValue: initialCategory,
                onChange: (e) => (categoryValue = e.target.value),
                className:
                  "w-full glass-input rounded-2xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5C5CFF]/70"
              },
              categories
                .filter((c) => c !== "All")
                .map((cat) =>
                  h("option", { key: cat, value: cat }, cat)
                )
            )
          ),
          h(
            "div",
            { className: "space-y-1" },
            h(
              "label",
              { className: "text-xs text-white/50" },
              "Image URL (4:5 ratio image)"
            ),
            h("input", {
              defaultValue: initialImageUrl,
              onChange: (e) => (imageUrlValue = e.target.value),
              placeholder: "https://your-image-link...",
              className:
                "w-full glass-input rounded-2xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5C5CFF]/70 placeholder:text-white/30"
            })
          ),
          h(
            "div",
            { className: "space-y-1" },
            h(
              "label",
              { className: "text-xs text-white/50" },
              "Full Prompt"
            ),
            h("textarea", {
              defaultValue: initialPrompt,
              onChange: (e) => (promptValue = e.target.value),
              placeholder: "Paste your full prompt here...",
              className:
                "w-full glass-input rounded-2xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5C5CFF]/70 placeholder:text-white/30 min-h-[120px] resize-y"
            })
          ),
          h(
            "div",
            { className: "flex justify-end pt-1" },
            h(
              "button",
              {
                type: "submit",
                className:
                  "inline-flex items-center gap-1.5 rounded-2xl bg-white text-black px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-[#5C5CFF] hover:text-white transition-all active:scale-95"
              },
              h(Plus, { size: 14 }),
              editingPrompt ? "Save" : "Add"
            )
          )
        )
      )
    );
  }

  function renderFullView(data, options) {
    if (!data) return null;
    const { isOwner, isShared } = options;

    const showBack = isOwner && !isShared;
    const showShare = isOwner && !isShared;

    return h(
      "div",
      {
        className:
          "min-h-screen bg-[#050505] text-white selection:bg-[#5C5CFF] selection:text-white flex flex-col"
      },
      h(
        "header",
        {
          className:
            "pt-4 pb-2 px-4 md:px-0 flex justify-center"
        },
        h(
          "div",
          { className: "w-full max-w-md flex items-center justify-between" },
          showBack
            ? h(
                "button",
                {
                  type: "button",
                  onClick: closeFullView,
                  className:
                    "text-xs md:text-sm text-white/60 hover:text-white flex items-center gap-2"
                },
                "← Back"
              )
            : h("div", null),
          h(
            "div",
            {
              className:
                "px-3 py-1 rounded-full bg-white text-black text-[10px] font-bold uppercase tracking-[0.2em]"
            },
            "PV"
          ),
          h("div", null)
        )
      ),

      h(
        "main",
        { className: "flex-1 flex justify-center pb-8 px-4" },
        h(
          "div",
          {
            className:
              "w-full max-w-md bg-black rounded-[32px] border border-white/10 overflow-hidden flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.7)]"
          },
          h(
            "div",
            {
              className:
                "bg-black aspect-[4/5] w-full overflow-hidden"
            },
            data.imageUrl
              ? h("img", {
                  src: data.imageUrl,
                  alt: data.title || "Prompt image",
                  className: "w-full h-full object-cover"
                })
              : h(
                  "div",
                  {
                    className:
                      "w-full h-full flex items-center justify-center text-xs text-white/40"
                  },
                  "No image added"
                )
          ),
          h(
            "div",
            { className: "flex-1 flex flex-col px-5 pb-5 pt-4" },
            h(
              "div",
              { className: "mb-4" },
              h(
                "div",
                { className: "flex items-center gap-2 mb-2" },
                h(
                  "span",
                  {
                    className:
                      "px-3 py-1 rounded-full bg-white text-black text-[10px] font-bold uppercase tracking-[0.2em]"
                  },
                  data.category || "NanoBanana"
                )
              ),
              h(
                "h1",
                {
                  className:
                    "font-display text-xl md:text-2xl font-semibold"
                },
                data.title || "Untitled Prompt"
              )
            ),
            h(
              "div",
              {
                className:
                  "mt-auto bg-white/5 rounded-2xl border border-white/15 p-3 text-xs md:text-sm leading-snug max-h-52 overflow-y-auto no-scrollbar"
              },
              h(
                "pre",
                {
                  className:
                    "whitespace-pre-wrap break-words text-white/90"
                },
                data.prompt || ""
              )
            ),
            h(
              "div",
              { className: "mt-4 flex gap-3" },
              h(
                "button",
                {
                  type: "button",
                  onClick: () => copyPromptText(data),
                  className:
                    "flex-1 flex items-center justify-center gap-2 rounded-full bg-[#5C5CFF] text-white text-xs md:text-sm font-bold uppercase tracking-widest py-2.5 hover:bg-white hover:text-black transition-all active:scale-95"
                },
                h(Copy, { size: 16 }),
                "Copy prompt"
              ),
              showShare &&
                h(
                  "button",
                  {
                    type: "button",
                    onClick: () => sharePromptLink(data),
                    className:
                      "flex-1 flex items-center justify-center gap-2 rounded-full bg-white text-black text-xs md:text-sm font-bold uppercase tracking-widest py-2.5 hover:bg-transparent hover:text-white hover:border-white border border-transparent transition-all active:scale-95"
                  },
                  h(Share2, { size: 16 }),
                  "Share style"
                )
            )
          )
        )
      ),
      renderAddModal()
    );
  }

  // ---------- View Switch ----------
  if (view === "shared" && sharedData) {
    return renderFullView(sharedData, { isOwner: false, isShared: true });
  }

  if (view === "full" && selectedPrompt) {
    return renderFullView(selectedPrompt, { isOwner: true, isShared: false });
  }

  // ---------- Gallery View ----------
  return h(
    "div",
    {
      className:
        "min-h-screen bg-[#050505] text-white selection:bg-[#5C5CFF] selection:text-white"
    },
    h(
      "header",
      {
        className:
          "fixed top-0 left-0 right-0 z-30 px-4 md:px-6 py-4 md:py-6 bg-gradient-to-b from-[#050505] via-[#050505]/95 to-transparent pointer-events-none transition-all duration-300"
      },
      h(
        "div",
        {
          className:
            "flex items-center justify-between pointer-events-auto max-w-7xl mx-auto w-full"
        },
        h(
          "div",
          { className: "flex items-center gap-2 md:gap-3" },
          h(
            "div",
            {
              className:
                "w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-[#5C5CFF]/20 to-purple-500/20 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-[0_0_15px_rgba(92,92,255,0.3)]"
            },
            h(Sparkles, {
              size: 18,
              className: "text-[#5C5CFF] md:w-5 md:h-5",
              fill: "currentColor",
              fillOpacity: 0.2
            })
          ),
          h(
            "h1",
            {
              className:
                "text-xl md:text-2xl font-bold font-display tracking-tighter"
            },
            "Prompt",
            h("span", { className: "text-[#5C5CFF]" }, "Vault")
          )
        ),
        h(
          "button",
          {
            onClick: openAddModal,
            className:
              "flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-full bg-white text-black font-bold text-[10px] md:text-xs uppercase tracking-wider hover:bg-[#5C5CFF] hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.3)] active:scale-95 touch-manipulation"
          },
          h(Plus, { size: 14, strokeWidth: 3, className: "md:w-4 md:h-4" }),
          h("span", null, "Add", h("span", { className: "hidden sm:inline" }, " Prompt"))
        )
      )
    ),
    h(
      "main",
      { className: "pt-24 md:pt-28 pb-20 px-4 sm:px-6" },
      h(
        "div",
        { className: "max-w-7xl mx-auto" },
        h(
          "div",
          {
            className:
              "flex flex-col-reverse md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-8 md:mb-10"
          },
          h(
            "div",
            { className: "w-full md:w-auto -mx-4 px-4 md:mx-0 md:px-0" },
            h(
              "div",
              {
                className:
                  "flex items-center gap-3 overflow-x-auto no-scrollbar pb-1"
              },
              categories.map((cat) =>
                h(
                  "button",
                  {
                    key: cat,
                    onClick: () => setActiveCategory(cat),
                    className:
                      "px-4 md:px-5 py-2 md:py-2.5 rounded-full text-[11px] md:text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all duration-300 flex-shrink-0 touch-manipulation " +
                      (activeCategory === cat
                        ? "bg-white text-black shadow-[0_0_20px_-5px_rgba(255,255,255,0.5)]"
                        : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white")
                  },
                  cat
                )
              )
            )
          ),
          h(
            "div",
            { className: "relative w-full md:w-72 shrink-0 group" },
            h(
              "div",
              {
                className:
                  "absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
              },
              h(Search, {
                size: 16,
                className:
                  "text-white/30 group-focus-within:text-[#5C5CFF] transition-colors"
              })
            ),
            h("input", {
              type: "text",
              value: searchQuery,
              onChange: (e) => setSearchQuery(e.target.value),
              placeholder: "Search prompts...",
              className:
                "w-full bg-white/5 border border-white/10 text-white rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:bg-white/10 focus:border-[#5C5CFF]/50 transition-all placeholder:text-white/20 appearance-none"
            })
          )
        ),
        filteredPrompts.length === 0
          ? h(
              "div",
              {
                className:
                  "flex flex-col items-center justify-center py-16 md:py-20 text-center"
              },
              h(
                "div",
                {
                  className:
                    "w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6"
                },
                searchQuery
                  ? h(Search, {
                      size: 28,
                      className: "text-white/20 md:w-8 md:h-8"
                    })
                  : h(Plus, {
                      size: 28,
                      className: "text-white/20 md:w-8 md:h-8"
                    })
              ),
              h(
                "h2",
                {
                  className:
                    "text-lg md:text-xl font-display text-white/80 mb-2"
                },
                searchQuery
                  ? `No results for "${searchQuery}"`
                  : activeCategory === "All"
                  ? "Vault Empty"
                  : `No ${activeCategory} Prompts`
              ),
              h(
                "p",
                {
                  className:
                    "text-white/40 max-w-xs mx-auto mb-8 text-sm md:text-base"
                },
                searchQuery
                  ? "Try checking your spelling or use different keywords."
                  : activeCategory === "All"
                  ? "Start your collection by adding your first AI generation prompt."
                  : "Try selecting a different category or add a new one."
              ),
              activeCategory === "All" &&
                !searchQuery &&
                h(
                  "button",
                  {
                    onClick: openAddModal,
                    className:
                      "text-[#5C5CFF] hover:text-white transition-colors text-sm font-bold uppercase tracking-wider p-2"
                  },
                  "+ Add New Prompt"
                )
            )
          : h(
              "div",
              {
                className:
                  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-x-6 md:gap-y-12"
              },
              filteredPrompts.map((prompt) => renderPromptCard(prompt))
            )
      )
    ),
    renderAddModal()
  );
}

export default App;
