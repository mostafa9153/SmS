


/** "Environment & Geography" -> "EG", "Mathematics" -> "Mat"; parentheses dropped, several subjects joined with "/" */
export function shortSubject(name: string): string {
  return name
    .replace(/\([^)]*\)/g, "")
    .split(",")
    .map((part) => {
      const words = part.replace(/&/g, " ").trim().split(/\s+/).filter(Boolean);
      if (words.length === 0) return "";
      return words.length === 1
        ? words[0].slice(0, 3)
        : words.map((w) => w[0].toUpperCase()).join("");
    })
    .filter(Boolean)
    .join("/");
}
