const urlPattern = /(https?:\/\/[^\s]+)/g;
const exactUrlPattern = /^https?:\/\/[^\s]+$/;

export function LinkifiedText({ text }: { text: string }) {
  return (
    <div className="linkified-text">
      {text.split("\n").map((line, lineIndex) => (
        <p key={`${line}-${lineIndex}`}>
          {line.split(urlPattern).map((part, partIndex) =>
            exactUrlPattern.test(part) ? (
              <a key={`${part}-${partIndex}`} href={part} target="_blank" rel="noreferrer">
                {part}
              </a>
            ) : (
              <span key={`${part}-${partIndex}`}>{part}</span>
            )
          )}
        </p>
      ))}
    </div>
  );
}
