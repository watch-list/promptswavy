import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Sparkles,
  Copy,
  Share2,
  Edit3
} from "lucide-react";

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
  // Home card styled like your screenshot
  function renderPromptCard(prompt) {
    const hasImage = !!prompt.imageUrl;

    return h(
      "div",
      {
        key: prompt.id,
        onClick: () => openPrompt(prompt), // whole card → full view
        className: "group cursor-pointer flex flex-col items-start"
      },

      // Image block
      hasImage &&
        h(
          "div",
          {
            className:
              "w-full rounded-[32px] sm:rounded-[40px] overflow-hidden border border-white/10 bg-black shadow-[0_15px_40px_rgba(0,0,0,0.8)]"
          },
          h(
            "div",
            { className: "aspect-[4/5] w-full bg-black overflow-hidden" },
            h("img", {
              src: prompt.imageUrl,
              alt: prompt.title || "Prompt image",
              className: "w-full h-full object-cover"
            })
          )
        ),

      // Title
      h(
        "h2",
        {
          className:
            "mt-4 font-display text-base md:text-lg font-semibold tracking-tight text-white line-clamp-1"
        },
        prompt.title || "Untitled Prompt"
      ),

      // Category pill
      h(
        "div",
        {
          className:
            "mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em]"
        },
        h("span", {
          className:
            "w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_0_4px_rgba(250,204,21,0.25)]"
        }),
        h(
          "span",
          { className: "text-white/90" },
          (prompt.category || "NanoBanana").toUpperCase()
        )
      ),

      // Buttons row: EDIT + SHARE
      h(
        "div",
        {
          className:
            "mt-3 flex gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
        },

        // Edit button
        h(
          "button",
          {
            type: "button",
            onClick: (e) => {
              e.stopPropagation(); // don’t open full view when editing
              openEditModal(prompt);
            },
            className:
              "flex-1 flex items-center justify-center gap-2 rounded-full bg-white/5 border border-white/15 text-white/80 hover:bg-white hover:text-black transition-all py-2 active:scale-95"
          },
          h(Edit3, { size: 14 }),
          "Edit"
        ),

        // Share button
        h(
          "button",
          {
            type: "button",
            onClick: (e) => {
              e.stopPropagation(); // stay on home while sharing
              sharePromptLink(prompt);
            },
            className:
              "flex-1 flex items-center justify-center gap-2 rounded-full bg-white/5 border border-white/15 text-white/80 hover:bg-white hover:text-black transition-all py-2 active:scale-95"
          },
          h(Share2, { size: 14 }),
          "Share"
        )
      )
    );
  }

  function renderAddModal() {
    if (!isAddModalOpen) return null;

    const initialTitle = editingPrompt ? editingPrompt.title || "" : "";
    const initialCategory = editingPrompt
      ? editingPrompt.category || "NanoBanana"
      : "NanoBanana";
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
          // Title
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
          // Category
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
          // Image URL
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
          // Prompt text
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
          // Buttons
          h(
            "div",
            { className: "flex justify-end pt-1" },
            h(
              "button",
              {
                type: "submit",
                className:
                  "inline-flex items-center gap-1.5 rounded-2xl bg-white text-black px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-[#5C5CFF] hover:text
