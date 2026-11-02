"""Build a source-only archive from an explicit public-source allowlist."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
allowed = ["LICENSE", "README.md", "HANDOFF.md", "Makefile", ".gitignore", ".gitmodules",
           "Sources", "Resources", "grayscale.xcodeproj", "MASShortcut", "browser", "theme", "tools", "research"]
excluded = {".git", ".DS_Store", "Cached Theme.pak", "build", "node_modules", "xcuserdata", "__pycache__"}
target = root / "build" / "grayscale-code-friendly-source.zip"
target.parent.mkdir(exist_ok=True)
with ZipFile(target, "w", ZIP_DEFLATED) as archive:
    for name in allowed:
        path = root / name
        for entry in sorted(path.rglob("*") if path.is_dir() else [path]):
            relative = entry.relative_to(root)
            if any(part in excluded for part in relative.parts):
                continue
            if entry.is_symlink():
                resolved = entry.resolve()
                if root in resolved.parents and resolved.is_file():
                    archive.write(resolved, Path("grayscale-code-friendly") / relative)
                continue
            if entry.is_file() and not entry.name.startswith(".env") and entry.suffix not in {".log", ".pyc"}:
                archive.write(entry, Path("grayscale-code-friendly") / relative)
print("Created build/grayscale-code-friendly-source.zip (public source allowlist only).")
