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
        // Shared read-only view
        const encoded = hash.split("#/share/")[1];
        const decoded = decodeShareData(encoded);
        if (decoded) {
          setSharedData(decoded);
          setView("shared");
        } else {
          window.location.hash = "";
        }
      } else if (hash.startsWith("#/view/")) {
        // Owner full view
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
        // Gallery view
        setView("gallery");
        setSelectedPrompt(null);
        setSharedData(null);
        loadData();
      }
    }

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange(); // initial

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
    const ok = await copyToClipboard(data.prompt);
    if (ok) {
      // optional: toast-ish feeling
      console.log("Prompt copied");
    }
  }

  // ---------- Filters ----------
  const filteredPrompts = prompts.filter((p) => {
