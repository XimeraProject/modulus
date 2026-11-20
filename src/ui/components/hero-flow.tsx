import { Check } from 'lucide-react'

/**
 * The home hero's illustration: a Ximera activity page above a Carmen gradebook, joined by the
 * score Modulus sends from one to the other. The one load animation (progress fills, the score
 * travels, the gradebook cell lands) lives in `src/ui/styles/components/hero.css` and is skipped
 * under reduced motion. Student names are fictional.
 */

const ROWS: { name: string; scores: [string, string, string]; you?: boolean }[] = [
  { name: 'Jordan K.', scores: ['100%', '80%', '–'], you: true },
  { name: 'Priya S.', scores: ['95%', '100%', '60%'] },
  { name: 'Marcus T.', scores: ['100%', '70%', '–'] },
  { name: 'Elena R.', scores: ['90%', '100%', '100%'] },
]

const COLUMNS = ['3.1', '3.2', '3.3']
const GRID =
  'grid grid-cols-[1.5fr_1fr_1fr_1fr] divide-x divide-osu-gray-100 dark:divide-canvas-700 [&>*]:px-2'

export function HeroFlow() {
  return (
    <figure
      className="hero-flow relative mx-auto w-full max-w-[34rem]"
      role="img"
      aria-label="A student's progress on a Ximera activity appears as their score in the Carmen gradebook."
    >
      {/* The Ximera activity, set like a textbook page. */}
      <div className="rounded-sm border border-osu-gray-200 bg-white px-5 pt-4 pb-5 shadow-[0_1px_0_var(--osu-gray-200)] dark:border-canvas-600 dark:bg-canvas-800 dark:shadow-none">
        <div className="flex items-baseline justify-between text-xs text-gray-500 dark:text-gray-300">
          <span className="font-semibold text-gray-700 dark:text-gray-100">Ximera</span>
          <span>Calculus One</span>
        </div>
        <p className="mt-3 font-serif text-xl text-gray-900 dark:text-white">3.2 Related rates</p>
        <p className="mt-2 font-serif text-[0.95rem] leading-relaxed text-gray-700 dark:text-gray-200">
          A 13&nbsp;ft ladder leans against a wall, and its foot slides away at 2&nbsp;ft/s. How
          fast is the top sliding down when the foot is 5&nbsp;ft from the wall?
        </p>
        <div className="mt-3 flex items-center gap-2 font-serif text-[0.95rem] text-gray-700 dark:text-gray-200">
          <span className="inline-flex min-w-16 items-center justify-center rounded-sm border border-osu-gray-300 bg-osu-gray-25 px-2 py-0.5 dark:border-canvas-500 dark:bg-canvas-900">
            −5/6
          </span>
          <span>ft/s</span>
          <Check className="ml-1 h-4 w-4 text-green-700 dark:text-green-400" aria-hidden="true" />
        </div>
        <div className="mt-5 flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
          <span>Your progress</span>
          <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-osu-gray-100 dark:bg-canvas-600">
            <span className="hero-flow-progress absolute inset-y-0 left-0 w-[80%] rounded-full bg-scarlet-500 dark:bg-scarlet-300" />
          </span>
          <span className="tabular-nums font-semibold text-gray-900 dark:text-white">80%</span>
        </div>
      </div>

      {/* The score Modulus sends, dropping onto the 3.2 column. */}
      <div className="relative h-12 px-5" aria-hidden="true">
        <div className="relative h-full">
          <span className="hero-flow-thread absolute top-0 bottom-0 left-[calc(200%/3)] w-0.5 -translate-x-1/2 bg-scarlet-500 dark:bg-scarlet-300" />
          <span className="hero-flow-label absolute top-1/2 right-[calc(100%/3)] mr-3 -translate-y-1/2 whitespace-nowrap text-xs font-medium text-scarlet-600 dark:text-scarlet-200">
            Score sent by Modulus
          </span>
        </div>
      </div>

      {/* The Carmen gradebook. */}
      <div className="rounded-md border border-osu-gray-200 bg-white px-5 py-4 dark:border-canvas-600 dark:bg-canvas-800">
        <div className="mb-2 flex items-baseline justify-between text-xs text-gray-500 dark:text-gray-300">
          <span className="font-semibold text-gray-700 dark:text-gray-100">Carmen gradebook</span>
          <span>Calculus One</span>
        </div>
        <div
          className={`${GRID} rounded-t-sm border-b border-osu-gray-200 bg-osu-gray-50 py-1.5 text-xs font-semibold text-gray-600 dark:border-canvas-600 dark:bg-canvas-700 dark:text-gray-300`}
        >
          <span>Student</span>
          {COLUMNS.map((column) => (
            <span key={column} className="text-center">
              {column}
            </span>
          ))}
        </div>
        {ROWS.map((row) => (
          <div
            key={row.name}
            className={`${GRID} items-center border-b border-osu-gray-100 py-1.5 text-sm text-gray-800 last:border-b-0 dark:border-canvas-700 dark:text-gray-100`}
          >
            <span>{row.name}</span>
            {row.scores.map((score, index) =>
              row.you && index === 1 ? (
                <span key={COLUMNS[index]} className="flex justify-center">
                  <span className="hero-flow-cell rounded-sm px-2 tabular-nums font-semibold text-scarlet-600 ring-2 ring-scarlet-500 dark:text-scarlet-100 dark:ring-scarlet-300">
                    {score}
                  </span>
                </span>
              ) : (
                <span key={COLUMNS[index]} className="text-center tabular-nums">
                  {score}
                </span>
              )
            )}
          </div>
        ))}
      </div>
    </figure>
  )
}
