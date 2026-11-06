type ComingSoonTemplateProps = {
  badge: string;
  title: string;
  subtitle: string;
  tags: string[];
  footnote: string;
};

export function ComingSoonTemplate({ badge, title, subtitle, tags, footnote }: ComingSoonTemplateProps) {
  return (
    <main className="mx-auto flex w-full max-w-[1350px] flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center sm:px-5">
      <span className="rounded-full bg-muted px-4 py-1 text-sm text-muted-foreground">{badge}</span>
      <h1 className="font-heading text-[clamp(2rem,5vw,3.5rem)] leading-tight font-bold text-balance text-heading">
        {title}
      </h1>
      <p className="max-w-2xl text-base text-pretty sm:text-lg">{subtitle}</p>
      <ul className="flex flex-wrap justify-center gap-3">
        {tags.map((tag) => (
          <li
            key={tag}
            className="rounded-lg bg-linear-[116.85deg] from-gradient-from/20 to-gradient-to/20 px-5 py-3 font-heading font-semibold text-heading"
          >
            {tag}
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">{footnote}</p>
    </main>
  );
}
