import katex from "katex";
import styles from "./scientific-text.module.css";

const tokenPattern = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$\n]+?\$|\\\([^\n]+?\\\)|\\cite\{[^}]+\})/gu;

export function ScientificText({ text }: { text: string }) {
  const segments = text.split(tokenPattern).filter(Boolean);
  return (
    <span className={styles.root}>
      {segments.map((segment, index) => {
        const citation = /^\\cite\{([^}]+)\}$/u.exec(segment);
        if (citation) return <cite key={`${segment}:${index}`}>[{citation[1]}]</cite>;

        const display = (segment.startsWith("$$") && segment.endsWith("$$"))
          || (segment.startsWith("\\[") && segment.endsWith("\\]"));
        const inline = (segment.startsWith("$") && segment.endsWith("$"))
          || (segment.startsWith("\\(") && segment.endsWith("\\)"));
        if (!display && !inline) return <span key={`${segment}:${index}`}>{segment}</span>;

        const source = display ? segment.slice(2, -2) : segment.startsWith("\\(") ? segment.slice(2, -2) : segment.slice(1, -1);
        const markup = katex.renderToString(source, {
          displayMode: display,
          output: "mathml",
          throwOnError: false,
          trust: false,
          strict: "ignore",
          maxExpand: 500,
          maxSize: 10,
        });
        return <span key={`${segment}:${index}`} className={display ? styles.display : styles.inline} tabIndex={display ? 0 : undefined} dangerouslySetInnerHTML={{ __html: markup }} />;
      })}
    </span>
  );
}
