// Copy for the navigation lab: what each direction is, fixes, costs, and how it scores.
export type DirId = 'a' | 'b' | 'c' | 'd' | 'e';
export type Score = { find: number; focus: number; mobile: number; ages: number; build: number };

export const DIRECTIONS: { id: DirId; name: string; idea: string; fixes: string[]; costs: string[]; bestFor: string; tryIt: string[]; score: Score }[] = [
  {
    id: 'a', name: 'Section bar',
    idea: 'A slim global bar plus a second bar that lists the pages of the section you are in.',
    fixes: ['You can see where you are: on any privacy page, Ironwood, Turnstile and Wall of Shame are one click away', 'Node status and “data through” are said once, in a pill, instead of in every page header', 'No crumbs and no kicker: the two bars already say where you are'],
    costs: ['A second bar (42px) on every page that belongs to a section', 'Charts have 58 pages, so their bar lists the 7 groups, not the charts'],
    bestFor: 'People who land deep from a shared link and want to know what else is nearby.',
    tryIt: ['Tab to “Tools”, press Enter, then Escape: focus goes back to the button', 'Open the status pill', 'On the Privacy hub, open “On this page”'],
    score: { find: 4, focus: 4, mobile: 4, ages: 5, build: 4 },
  },
  {
    id: 'b', name: 'Command line',
    idea: 'A wide search field is the main way around; the sections shrink to tabs and the breadcrumb becomes a terminal path.',
    fixes: ['Every one of the 89 pages is a few keystrokes away, and synonyms work (“cost basis”, “z-to-z”)', 'With nothing typed, it shows Recent and Popular pages with their live values', '“Tools” narrows the search to tools instead of opening a 23-link menu'],
    costs: ['Three rows of chrome on a phone (brand, field, tabs): the answer starts lowest of all five', 'Browsing without a goal is weaker: you have to know or guess a word', 'The path (~/charts/price-valuation/price) is a metaphor; the real URL stays /chart/price'],
    bestFor: 'Regulars and analysts who know what they want.',
    tryIt: ['Click the field: Recent + Popular with values', 'Type “shield”, then use ↑ ↓ and Enter', 'Click the “Tools” tab: the field filters to tools'],
    score: { find: 4, focus: 2, mobile: 3, ages: 4, build: 3 },
  },
  {
    id: 'c', name: 'Questions',
    idea: 'Menus are grouped by the question you bring (worth? private? used? secure? where does it move?) and every item shows its live value.',
    fixes: ['The menu answers before you click: 29.3% shielded, 89.24% crossed, 32.63 GH/s', 'Privacy stays a top-level menu, opening on a large Ironwood card', 'Charts and tools for the same question sit together instead of in separate menus'],
    costs: ['Every page has to load ~30 live values just for the menu', 'The questions need upkeep as pages are added; some pages fit two questions', 'The page header changes least: crumbs and the freshness note shrink but stay'],
    bestFor: 'First-time visitors who are curious but don’t know the site’s words yet.',
    tryIt: ['Open “Privacy”: Ironwood is the big card', 'Open “Explore”: four questions with values', 'On a phone, Menu shows the same questions as an accordion'],
    score: { find: 4, focus: 3, mobile: 3, ages: 2, build: 2 },
  },
  {
    id: 'd', name: 'Answer first',
    idea: 'The breadcrumb and the section’s pages merge into one bar; the page header becomes just the title and the one-sentence answer.',
    fixes: ['One bar says where you are: the breadcrumb and the section’s pages are merged', 'On a chart page, the group crumb is a switcher listing all 11 charts in the group, with values, and the key figure sits beside the title', 'The Privacy hero starts 117px higher than today on desktop, and 205px higher on a phone'],
    costs: ['The key figure repeats the number in the sentence next to it, so it is hidden on phones', 'Page-specific notes such as update cadence move into the chart caption or the status popover'],
    bestFor: 'Everyone on a single-answer page: chart pages, Ironwood, Halving.',
    tryIt: ['On the chart page, open “Price & valuation”', 'Use the ‹ › arrows to go to the previous or next chart', 'Compare the “answer” offset in each frame’s header with A–C'],
    score: { find: 4, focus: 5, mobile: 4, ages: 4, build: 4 },
  },
  {
    id: 'e', name: 'Thumb',
    idea: 'On phones a bottom tab bar (Dashboard · Privacy · Charts · Search · Menu); on desktop the same five as a left rail.',
    fixes: ['On a phone, search and the menu are in thumb reach and always visible, not hidden behind the burger', 'With no global top bar on desktop, the answer starts highest of all five directions', 'The same five destinations, in the same order, on every device'],
    costs: ['A permanent 60px bar at the bottom of phones, next to Safari’s own toolbar', 'A left rail feels app-like on a reading site, and takes 80px of width on desktop', 'News and Tools move one level deeper'],
    bestFor: 'Phone-heavy repeat visitors who check the same few numbers.',
    tryIt: ['In the phone frame, tap Search or Menu: the sheet keeps the tab bar visible', 'On desktop, open Menu from the rail', 'Press Escape: focus returns to the rail button'],
    score: { find: 3, focus: 4, mobile: 5, ages: 3, build: 2 },
  },
];

export const CRITERIA: { key: keyof Score; label: string; hint: string }[] = [
  { key: 'find', label: 'Findability', hint: 'reach any of the 89 pages; know what’s nearby' },
  { key: 'focus', label: 'Focus on the answer', hint: 'how little stands between the top and the answer' },
  { key: 'mobile', label: 'Mobile', hint: 'at 390px: reach, density, no overflow' },
  { key: 'ages', label: 'Ages well', hint: 'survives new pages without redesign' },
  { key: 'build', label: 'Build cost', hint: '5 = cheapest to adopt' },
];
