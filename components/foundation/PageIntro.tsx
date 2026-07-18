interface PageIntroProps {
  title: string;
  supporting: string;
}

/**
 * The "judgement before mechanics" component (Asset 021 §3.2/§4) — a page
 * should open with what it's for, not with its first control. `title`
 * takes the editorial role deliberately (Asset 021 §5.1 names "page
 * titles" as an editorial use case); `supporting` stays Interface
 * typography, one plain sentence.
 */
export function PageIntro({ title, supporting }: PageIntroProps) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-editorial-title">{title}</h1>
      <p className="text-sm text-ink-faint">{supporting}</p>
    </div>
  );
}
