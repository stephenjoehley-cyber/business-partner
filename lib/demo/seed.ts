import { generateSignalsForBusiness } from '@/lib/signals/pipeline';
import { generateMorningBrief } from '@/lib/cognition/pipeline';
import { DEMO_BUSINESS_ID } from './config';
import { isDemoSeeded, markDemoSeeded } from './store';

/**
 * Runs once per server process. Deliberately calls the *real* pipelines
 * (`generateSignalsForBusiness`, `generateMorningBrief`) rather than
 * hand-authoring a signal list or a MorningBriefResult directly — the
 * whole point of Demo Mode is to demonstrate the actual Signal Provider →
 * Cognitive Engine → Narrative Layer architecture, not a parallel mock of
 * it. Both functions are already Demo Mode-aware transitively, through the
 * repository layer they call into (`lib/brain/repository.ts`,
 * `lib/signals/repository.ts`, `lib/cognition/repository.ts`), so this
 * function itself contains no demo-specific business logic — only the
 * "run once" orchestration.
 *
 * Business/Goals/People are seeded synchronously in `lib/demo/store.ts` at
 * module load — this only needs to generate Signals and the first Morning
 * Brief, which requires actually running the pipeline.
 *
 * Safe to call on every request: `isDemoSeeded()` short-circuits after the
 * first successful run, and concurrent first requests (a real possibility
 * during Next.js dev-server startup) share one in-flight promise rather
 * than racing to seed twice.
 */
let seedingPromise: Promise<void> | null = null;

export async function ensureDemoSeeded(): Promise<void> {
  if (isDemoSeeded()) return;

  if (!seedingPromise) {
    seedingPromise = (async () => {
      await generateSignalsForBusiness(DEMO_BUSINESS_ID);
      await generateMorningBrief(DEMO_BUSINESS_ID);
      markDemoSeeded();
    })().catch((error) => {
      // Let the next request try again rather than permanently wedging
      // the demo on a transient failure.
      seedingPromise = null;
      throw error;
    });
  }

  await seedingPromise;
}
