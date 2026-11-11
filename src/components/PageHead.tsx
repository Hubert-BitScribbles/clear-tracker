import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/**
 * A page's title, its tabs (the segmented Trends | Reports and similar) and,
 * where a page has them, its period choices — kept in view while the page
 * scrolls (styles: `.page-head` in base.css). It also tells the page how tall
 * it is (`--head-h`), so links to a section (#drink, #savings, Help articles)
 * land below it rather than under it. A hairline shows only once something
 * has scrolled beneath.
 */
export function PageHead({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    // Not sticky (short landscape screens, print): nothing to make room for.
    const size = () => root.style.setProperty('--head-h', getComputedStyle(el).position === 'sticky' ? `${el.offsetHeight}px` : '0px');
    size();
    const ro = new ResizeObserver(size);
    ro.observe(el);
    let frame = 0;
    const check = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const top = parseFloat(getComputedStyle(el).top) || 0;
        setStuck(window.scrollY > 0 && el.getBoundingClientRect().top <= top + 0.5);
      });
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', size);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', size);
      root.style.removeProperty('--head-h');
    };
  }, []);

  return (
    <div ref={ref} className={className ? `page-head ${className}` : 'page-head'} data-stuck={stuck || undefined}>
      {children}
    </div>
  );
}
