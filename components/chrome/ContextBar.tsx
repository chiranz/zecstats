'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { NavData, NavItem } from '@/lib/data/nav';
import { pageContext, pageJumps } from '@/lib/site';
import { useDisclosure } from './useDisclosure';

/**
 * Direction D context bar: the breadcrumb and the section's pages in one row, under the event tape.
 * Privacy: section tabs (+ "On this page" on long pages). Charts and Tools: a group switcher + prev/next.
 * Dashboard, News and the Charts index get none (no siblings to show).
 */
export function ContextBar({ nav }: { nav: NavData }) {
  const pathname = usePathname();
  const ctx = pageContext(pathname);
  if (!ctx) return null;

  if (ctx.kind === 'privacy') {
    const jumps = pageJumps[pathname];
    return (
      <Bar>
        <nav aria-label="Breadcrumb" className="cx-crumb"><Link className="cx-root" href="/privacy">Privacy</Link><span className="cx-sl" aria-hidden="true">/</span></nav>
        <Tabs items={nav.privacy} current={pathname} />
        {jumps && <div className="cx-end"><OnThisPage jumps={jumps} /></div>}
      </Bar>
    );
  }

  let root: { href: string; label: string };
  let group: SwitchGroup;
  let pos: number;
  if (ctx.kind === 'chart') {
    const g = nav.chartGroups.find((x) => x.items.some((i) => i.href === pathname));
    if (!g) return null;
    root = { href: '/charts', label: 'Charts' };
    group = { title: g.title, overview: `/charts#g-${g.id}`, footer: { href: '/charts', label: `All ${nav.chartGroups.reduce((a, x) => a + x.items.length, 0)} charts` }, items: g.items };
    pos = g.items.findIndex((i) => i.href === pathname);
  } else {
    root = { href: '/tools', label: 'Tools' };
    group = { title: ctx.group.title, footer: { href: '/tools', label: 'All tools & methodology' }, items: ctx.group.links.map((l) => ({ href: l.href, label: l.label, desc: l.desc, value: nav.values[l.href] })) };
    pos = ctx.index;
  }
  const here = group.items[pos];
  const n = group.items.length;
  const prev = group.items[(pos - 1 + n) % n];
  const next = group.items[(pos + 1) % n];
  const kind = ctx.kind === 'chart' ? 'chart' : 'page';

  return (
    <Bar>
      <nav aria-label="Breadcrumb" className="cx-crumb">
        <Link className="cx-root" href={root.href}>{root.label}</Link>
        <span className="cx-sl" aria-hidden="true">/</span>
        <GroupSwitcher group={group} current={pathname} />
        <span className="cx-sl cx-wide" aria-hidden="true">/</span>
        <span className="cx-here cx-wide" aria-current="page">{here.label}</span>
      </nav>
      {n > 1 && (
        <div className="cx-end cx-pn">
          <Link className="cx-pnb" href={prev.href} aria-label={`Previous ${kind}: ${prev.label}`}><Icon name="chevron-left" size={14} /></Link>
          <span className="cx-pos">{pos + 1} of {n}</span>
          <Link className="cx-pnb" href={next.href} aria-label={`Next ${kind}: ${next.label}`}><Icon name="chevron-right" size={14} /></Link>
        </div>
      )}
    </Bar>
  );
}

type SwitchGroup = { title: string; overview?: string; footer: { href: string; label: string }; items: (NavItem & { desc?: string })[] };

function Bar({ children }: { children: React.ReactNode }) {
  return <div className="cx"><div className="shell cx-in">{children}</div></div>;
}

/** Section tabs; on narrow screens the current tab is scrolled into view. */
function Tabs({ items, current }: { items: NavItem[]; current: string }) {
  const ref = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const ul = ref.current;
    const el = ul?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!ul || !el) return;
    const u = ul.getBoundingClientRect(), r = el.getBoundingClientRect();
    if (r.right > u.right - 28 || r.left < u.left) ul.scrollLeft += r.left - u.left - 16;
  }, [current]);
  return (
    <ul className="cx-tabs" ref={ref} aria-label="Privacy pages">
      {items.map((it) => (
        <li key={it.href}>
          <Link href={it.href} className={`cx-tab${it.featured ? ' feat' : ''}`} aria-current={current === it.href ? 'page' : undefined}>
            {it.label}
            {it.featured && <span className="tag live" title="In progress now">LIVE</span>}
            {it.featured && it.value && <span className="cx-tv">{it.value}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function GroupSwitcher({ group, current }: { group: SwitchGroup; current: string }) {
  const d = useDisclosure();
  const close = () => d.setOpen(false);
  return (
    <div className="cx-dd" {...d.wrap}>
      <button {...d.button} className="cx-switch">{group.title} <Icon name={d.open ? 'chevron-up' : 'chevron-down'} size={10} /></button>
      {d.open && (
        <div id={d.id} className="cx-panel">
          <p className="cx-ph">{group.items.length} in {group.title}</p>
          <ul>
            {group.items.map((it) => (
              <li key={it.href}>
                <Link className="cx-mi" href={it.href} aria-current={it.href === current ? 'page' : undefined} onClick={close}>
                  <span className="cx-mt"><b>{it.label}</b>{it.desc && <small>{it.desc}</small>}</span>
                  {it.value && <span className="cx-mv">{it.value}</span>}
                </Link>
              </li>
            ))}
          </ul>
          <div className="cx-pf">
            {group.overview ? <Link href={group.overview} onClick={close}>Group overview</Link> : <span />}
            <Link href={group.footer.href} onClick={close}>{group.footer.label} <Icon name="arrow-right" size={12} /></Link>
          </div>
        </div>
      )}
    </div>
  );
}

function OnThisPage({ jumps }: { jumps: { id: string; label: string }[] }) {
  const d = useDisclosure();
  return (
    <div className="cx-dd cx-otp" {...d.wrap}>
      <button {...d.button} className="cx-otpb" aria-label="On this page">
        <Icon name="list" size={14} /><span className="cx-otpt" aria-hidden="true">On this page</span><Icon name={d.open ? 'chevron-up' : 'chevron-down'} size={10} />
      </button>
      {d.open && (
        <div id={d.id} className="cx-panel cx-right">
          <ul>{jumps.map((j) => <li key={j.id}><a className="cx-mi" href={`#${j.id}`} onClick={() => d.setOpen(false)}><span className="cx-mt"><b>{j.label}</b></span></a></li>)}</ul>
        </div>
      )}
    </div>
  );
}
