import type { BusinessContext } from '@/lib/signals/provider';
import type { Signal } from '@/lib/signals/types';
import type { InterpretedSignal, SignalInterpreter } from './types';
import { emailAwaitingReplyInterpreter, emailAwaitingReplyOverdueInterpreter } from './email';
import { meetingUpcomingInterpreter } from './calendar';
import { debtorOverdueInterpreter, creditorDueInterpreter } from './finance';
import { interpretUnknown } from './fallback';

/**
 * Every known interpreter, registered by "domain:type". Adding a new
 * signal type — e.g. a future Tasks provider's "task_overdue" — means
 * adding one entry here. Nothing in observe.ts, understand.ts,
 * prioritise.ts, or recommend.ts needs to change. Same pattern as
 * lib/signals/providers/index.ts (Increment 2).
 */
const INTERPRETERS: SignalInterpreter[] = [
  emailAwaitingReplyInterpreter,
  emailAwaitingReplyOverdueInterpreter,
  meetingUpcomingInterpreter,
  debtorOverdueInterpreter,
  creditorDueInterpreter,
];

const REGISTRY = new Map<string, SignalInterpreter>(
  INTERPRETERS.map((interpreter) => [`${interpreter.domain}:${interpreter.type}`, interpreter])
);

export function interpretSignal(signal: Signal, context: BusinessContext): InterpretedSignal {
  const interpreter = REGISTRY.get(`${signal.domain}:${signal.type}`);
  if (!interpreter) {
    return interpretUnknown(signal, context);
  }
  return interpreter.interpret(signal, context);
}
