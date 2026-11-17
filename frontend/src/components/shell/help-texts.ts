import { isActive } from "./nav-items";

/** `page` is null on a page without its own help; the sheet is then titled "Hjelp". */
export type HelpText = { page: string | null; text: string };

/** Help per route (story 6.4, UX-DR15). The longest matching route wins. */
const HELP_TEXTS: Readonly<Record<string, HelpText>> = {
  "/": {
    page: "I dag",
    text: "Her ser du dagen din: hvor mange kalorier du har igjen, hva du har spist og hvordan økta gikk. Trykk «Logg mat» eller «Start økt» for å legge til noe. Tallene oppdateres med en gang.",
  },
  "/mat": {
    page: "Mat",
    text: "Her logger du det du spiser. Søk etter en matvare, skann eller skriv inn strekkoden, eller velg noe du har spist før. Trykk på en logget matvare for å endre eller slette den.",
  },
  "/trening": {
    page: "Trening",
    text: "Her finner du øvelser som passer utstyret ditt. Bytt utstyrsprofil øverst, eller søk etter en øvelse. Trykk «Start økt» når du vil trene.",
  },
  "/trening/okt": {
    page: "Økt",
    text: "Her logger du økta. Fyll inn repetisjoner og kg for hvert sett og huk av når settet er ferdig. «Sist» viser hva du gjorde forrige gang. Trykk «Fullfør økt» når du er ferdig.",
  },
  "/trening/ovelser": {
    page: "Øvelse",
    text: "Her ser du hvordan du gjør øvelsen, med video og steg. «Legg til i økt» legger den i dagens økt. Start med lav vekt og øk rolig.",
  },
  "/profil": {
    page: "Profil",
    text: "Her endrer du kroppsdata, aktivitetsnivå og mål. Dagens kalorimål regnes ut på nytt når du lagrer. Under «Utstyr» lager du utstyrsprofiler.",
  },
  "/historikk": {
    page: "Historikk",
    text: "Her kommer en oversikt over tidligere dager.",
  },
};

export const FALLBACK_HELP_TEXT = "Bruk menyen for å gå mellom I dag, Mat, Trening og Profil.";

/** The help for `pathname`. */
export function helpFor(pathname: string): HelpText {
  const match = Object.keys(HELP_TEXTS)
    .filter((href) => isActive(pathname, href))
    .sort((a, b) => b.length - a.length)[0];
  return match ? HELP_TEXTS[match] : { page: null, text: FALLBACK_HELP_TEXT };
}
