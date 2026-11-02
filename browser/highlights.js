/* Event-driven prototype: recolor CSS boxes rather than filtering a parent of code. */
(() => {
  const preserve = "pre, code, mark, .hljs, [data-grayscale-preserve]";
  const colors = ["color", "background-color", "border-top-color", "border-right-color", "border-bottom-color",
    "border-left-color", "outline-color", "text-decoration-color", "caret-color", "accent-color", "fill", "stroke"];
  const skip = "script, style, link, meta, title, head";
  const relevantInline = (text) => (text?.match(/(?:^|;)\s*(?:color|background(?:-[\w-]+)?|border(?:-[\w-]+)?|outline(?:-[\w-]+)?|text-decoration-color|text-shadow|box-shadow|filter|fill|stroke|caret-color|accent-color|--[\w-]*(?:color|theme|background|foreground|accent)[\w-]*)\s*:[^;]*/gi) ?? []).join(";");
  const gray = (value, contrast) => {
    if (!value || ["none", "auto", "normal", "transparent"].includes(value)) return value;
    const rgb = value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/);
    if (rgb && (Number(rgb[4]) === 0 || contrast === 1 && rgb[1] === rgb[2] && rgb[2] === rgb[3])) return value;
    return `oklch(from ${value} clamp(0, calc((l - 0.5) * ${contrast} + 0.5), 1) 0 h)`;
  };
  globalThis.GrayscaleHighlights = class {
    constructor(contrast = 1) {
      this.contrast = contrast;
      this.edits = new Map();
      this.roots = new Set();
      this.stylesheetLoaded = (event) => {
        if (event.target.matches?.("link[rel=stylesheet]")) this.scan([document.documentElement]);
      };
      this.observer = new MutationObserver((records) => {
        let removed = false;
        for (const record of records) {
          if (record.target.nodeType !== 1 || record.target.matches?.("style[data-code-friendly-grayscale]")) continue;
          if (record.type === "attributes") {
            if (record.attributeName === "style" && relevantInline(record.oldValue) === relevantInline(record.target.getAttribute("style"))) continue;
            this.roots.add(record.target);
          }
          else {
            for (const node of record.addedNodes) if (node.nodeType === 1) this.roots.add(node.matches("style,link") ? document.documentElement : node);
            if (record.removedNodes.length) removed = true;
          }
        }
        if (removed) for (const [element] of this.edits) if (!element.isConnected) this.edits.delete(element);
        if (this.roots.size && !this.frame) this.frame = requestAnimationFrame(() => {
          this.frame = null;
          const roots = [...this.roots]; this.roots.clear();
          this.scan(roots.filter((root) => root.isConnected && !roots.some((other) => other !== root && other.contains(root))));
        });
      });
    }
    observe() {
      this.observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true,
        attributeOldValue: true, attributeFilter: ["style", "class", "data-theme"] });
    }
    start() {
      document.addEventListener("load", this.stylesheetLoaded, true);
      this.scan([document.documentElement]);
    }
    restore(element, edits) {
      for (const edit of edits) {
        // A site's later inline change belongs to the site, and must survive restoration.
        if (element.style.getPropertyValue(edit.name) !== edit.applied || element.style.getPropertyPriority(edit.name) !== "important") continue;
        if (edit.original) element.style.setProperty(edit.name, edit.original, edit.priority);
        else element.style.removeProperty(edit.name);
      }
    }
    scan(roots) {
      this.observer.disconnect();
      for (const [element, edits] of this.edits) if (roots.some((root) => root.contains(element))) {
        this.restore(element, edits); this.edits.delete(element);
      }
      const updates = [];
      // Read all original styles before writing, preserving inherited code-token colors.
      for (const root of roots) for (const element of [root, ...root.querySelectorAll("*")]) {
        if (!element.style || element.matches(skip)) continue;
        const protectedText = !!element.closest(preserve);
        if (protectedText && element.parentElement?.closest(preserve)) continue;
        const computed = getComputedStyle(element);
        const values = [];
        for (const name of protectedText ? ["color"] : colors) {
          const originalColor = computed.getPropertyValue(name);
          const value = protectedText ? originalColor : gray(originalColor, this.contrast);
          if (value && (protectedText || value !== originalColor) && CSS.supports(name, value)) values.push([name, value]);
        }
        if (!protectedText) {
          for (const name of ["box-shadow", "text-shadow", "background-image"]) {
            const original = computed.getPropertyValue(name);
            if (original && !original.includes("url(")) {
              const value = original.replace(/rgba?\([^)]*\)|color\([^)]*\)|oklch\([^)]*\)|oklab\([^)]*\)/g,
                (color) => gray(color, this.contrast));
              if (value !== original && CSS.supports(name, value)) values.push([name, value]);
            }
          }
          if ((element.matches("img, video, canvas, svg") || computed.backgroundImage.includes("url(")) && !element.querySelector(preserve)) {
            values.push(["filter", (computed.filter === "none" ? "" : computed.filter + " ") + "grayscale(1)"]);
          }
        }
        updates.push([element, values]);
      }
      for (const [element, values] of updates) {
        const edits = [];
        for (const [name, value] of values) {
          const original = element.style.getPropertyValue(name), priority = element.style.getPropertyPriority(name);
          element.style.setProperty(name, value, "important");
          edits.push({ name, original, priority, applied: element.style.getPropertyValue(name) });
        }
        if (edits.length) this.edits.set(element, edits);
      }
      this.observe();
    }
    stop() {
      this.observer.disconnect();
      document.removeEventListener("load", this.stylesheetLoaded, true);
      if (this.frame) cancelAnimationFrame(this.frame);
      for (const [element, edits] of this.edits) this.restore(element, edits);
      this.edits.clear(); this.roots.clear();
    }
  };
})();
