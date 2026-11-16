/** FR16: shown wherever Matvaretabellen data is shown. */
export function MatvaretabellenAttribution() {
  return (
    <p className="text-label text-muted-foreground">
      Matvaretabellen 2026. Mattilsynet.{" "}
      <a
        href="https://www.matvaretabellen.no"
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2"
      >
        www.matvaretabellen.no
      </a>
    </p>
  );
}

/** FR16: shown with items whose data comes from Open Food Facts (ODbL). */
export function OffAttribution() {
  return (
    <p className="text-label text-muted-foreground">
      Data fra{" "}
      <a
        href="https://world.openfoodfacts.org"
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2"
      >
        Open Food Facts
      </a>
    </p>
  );
}
