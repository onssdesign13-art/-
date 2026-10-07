import Link from "next/link";

export default function PageHeader({
  title,
  meta,
  back,
  actions,
}: {
  title: string;
  meta?: string;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <header className="border-b border-line px-6 py-6 md:px-10">
      {back ? (
        <Link href={back.href} className="label mb-3 inline-block hover:text-ink">
          ← {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-medium leading-tight md:text-[32px]">{title}</h1>
          {meta ? <p className="mono mt-2 text-[12px] text-muted">{meta}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
