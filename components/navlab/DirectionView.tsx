import Link from 'next/link';
import { Stage } from './ui';
import { DirA } from './DirA';
import { DirB } from './DirB';
import { DirC } from './DirC';
import { DirD } from './DirD';
import { DirE } from './DirE';
import { DIRECTIONS, type DirId } from './meta';
import { ctxPath, type Ctx, type NavData } from './types';
import s from './view.module.css';

const COMPONENTS = { a: DirA, b: DirB, c: DirC, d: DirD, e: DirE } as const;

export function DirSwitcher({ current }: { current?: DirId }) {
  return (
    <nav aria-label="Directions" className={s.switcher}>
      <ul>
        <li><Link href="/design/nav" aria-current={!current ? 'page' : undefined}>Overview</Link></li>
        {DIRECTIONS.map((d) => (
          <li key={d.id}><Link href={`/design/nav/${d.id}`} aria-current={current === d.id ? 'page' : undefined}><b>{d.id.toUpperCase()}</b> {d.name}</Link></li>
        ))}
      </ul>
    </nav>
  );
}

/** One direction: idea, fixes/costs, then the prototype in four frames (two pages × desktop/phone). */
export function DirectionView({ id, data }: { id: DirId; data: NavData }) {
  const d = DIRECTIONS.find((x) => x.id === id)!;
  const Dir = COMPONENTS[id];
  const frame = (ctx: Ctx, phone: boolean) => (
    <Stage label={`${ctx === 'privacy' ? 'Privacy hub' : 'Chart page'} · ${phone ? 'phone 390' : 'desktop'}`} path={ctxPath(ctx)} phone={phone}>
      <Dir ctx={ctx} data={data} />
    </Stage>
  );
  return (
    <div className={s.page}>
      <DirSwitcher current={id} />
      <header className={s.head}>
        <span className="kicker">Navigation lab · direction {id.toUpperCase()}</span>
        <h1 className="h1">{d.name}</h1>
        <p className="lede">{d.idea}</p>
      </header>
      <div className={s.facts}>
        <section aria-labelledby="fx"><h2 id="fx" className={s.fh}>Fixes</h2><ul>{d.fixes.map((x) => <li key={x}>{x}</li>)}</ul></section>
        <section aria-labelledby="cs"><h2 id="cs" className={s.fh}>Costs</h2><ul>{d.costs.map((x) => <li key={x}>{x}</li>)}</ul></section>
        <section aria-labelledby="bf"><h2 id="bf" className={s.fh}>Best for</h2><p>{d.bestFor}</p><h2 className={s.fh}>Try</h2><ul>{d.tryIt.map((x) => <li key={x}>{x}</li>)}</ul></section>
      </div>
      <p className={s.note}>Each frame is a working prototype: menus open, links go to the real pages, search uses the site’s real index (Escape closes, focus returns). Frames lay out by their own width, so the phone frames show the real 390px layout. The dashed strip is the reserved ticker slot; switch it off in the frame header. ⌘K stays with the site’s real bar on this preview.</p>
      <section className={s.sec} aria-labelledby="desk"><h2 id="desk" className="h2">Privacy hub</h2>{frame('privacy', false)}</section>
      <section className={s.sec} aria-labelledby="desk2"><h2 id="desk2" className="h2">Chart page</h2>{frame('chart', false)}</section>
      <section className={s.sec} aria-labelledby="mob"><h2 id="mob" className="h2">On a phone</h2><div className={s.phones}>{frame('privacy', true)}{frame('chart', true)}</div></section>
      <nav aria-label="Next direction" className={s.pager}>
        {DIRECTIONS.map((x, i) => x.id === id && (
          <span key={x.id} className={s.pagerIn}>
            {i > 0 ? <Link href={`/design/nav/${DIRECTIONS[i - 1].id}`}>← {DIRECTIONS[i - 1].id.toUpperCase()} {DIRECTIONS[i - 1].name}</Link> : <Link href="/design/nav">← Overview</Link>}
            {i < DIRECTIONS.length - 1 ? <Link href={`/design/nav/${DIRECTIONS[i + 1].id}`}>{DIRECTIONS[i + 1].id.toUpperCase()} {DIRECTIONS[i + 1].name} →</Link> : <Link href="/design/nav#pick">The recommendation →</Link>}
          </span>
        ))}
      </nav>
    </div>
  );
}
