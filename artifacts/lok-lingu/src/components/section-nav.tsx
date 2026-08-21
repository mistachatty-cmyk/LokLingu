import { useEffect, useRef, useState } from 'react';

export interface NavSection {
  id: string;
  label: string;
}

/**
 * A sticky, horizontally-scrolling section jump-bar.
 *
 * Two things make this fiddlier than a normal anchor nav:
 *
 *  1. The scroll container is `<main>` in `layout.tsx`, not the document.
 *     A `window` scroll listener would never fire, and IntersectionObserver
 *     needs that element as its `root` or every section reads as visible.
 *  2. The bar itself overlaps the top of the container, so the observer's
 *     top margin is inset by roughly the bar's height — otherwise a section
 *     is "active" while it is still hidden behind the bar.
 *  3. `scrollIntoView` walks and adjusts EVERY scrollable ancestor of its
 *     target, not just the nearest one. The "keep the active chip in view"
 *     effect used to call `chip.scrollIntoView(...)` directly — since the
 *     chip's ancestors are the horizontal pill row AND `main`, every time
 *     the IntersectionObserver fired mid-scroll (which it does repeatedly
 *     during a `jump()`, as sections pass through the viewport) that call
 *     re-adjusted `main`'s scroll too, cancelling the section-jump animation
 *     partway through. Concretely: tapping a pill would only ever scroll
 *     about one section down, then stop. Fixed by scrolling the pill row's
 *     own `scrollLeft` directly instead, which never touches `main`.
 */
export function SectionNav({ sections }: { sections: NavSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? '');
  const barRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    const root = barRef.current?.closest('main') ?? null;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry nearest the top of the viewport rather than the
        // first intersecting one; with tall sections several qualify at once.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { root, rootMargin: '-72px 0px -55% 0px', threshold: 0 },
    );

    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  // Keep the active chip in view as the page scrolls past sections. Scrolls
  // the pill row's own scrollLeft directly rather than chip.scrollIntoView()
  // — see the file header for why that broke the vertical section jump.
  useEffect(() => {
    const chip = chipRefs.current.get(active);
    const row = rowRef.current;
    if (!chip || !row) return;
    const chipLeft = chip.offsetLeft;
    const chipRight = chipLeft + chip.offsetWidth;
    const viewLeft = row.scrollLeft;
    const viewRight = viewLeft + row.clientWidth;
    if (chipLeft < viewLeft || chipRight > viewRight) {
      const target = chipLeft - row.clientWidth / 2 + chip.offsetWidth / 2;
      row.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    }
  }, [active]);

  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    // scrollIntoView resolves against the nearest scrollable ancestor, which
    // is `main` here, so this works without manual offset maths.
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActive(id);
  };

  return (
    <div
      ref={barRef}
      className="sticky top-0 z-30 -mx-5 px-5 py-2 bg-background/85 backdrop-blur-xl border-b border-border"
    >
      <div
        ref={rowRef}
        className="flex gap-1.5 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        {sections.map((s) => {
          const isActive = active === s.id;
          return (
            <button
              key={s.id}
              ref={(el) => {
                if (el) chipRefs.current.set(s.id, el);
                else chipRefs.current.delete(s.id);
              }}
              onClick={() => jump(s.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
