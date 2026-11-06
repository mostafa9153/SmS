/**
 * Catalog matching (plan K1). Pure, shared by the server duplicate check and
 * the add-book dialog. Two entries are the same title when their keys match:
 * Unicode NFC, case-folded, zero-width marks and punctuation dropped, spaces
 * squeezed. Authors must match too, unless one side has none.
 */

const INVISIBLE = /[​-‏⁠﻿]/g;
// ASCII punctuation, dashes, quotes and the Bengali danda.
const PUNCT = /[!-/:-@[-`{-~‐-―‘-‟।॥]/g;

export function titleKey(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFC")
    .replace(INVISIBLE, "")
    .toLocaleLowerCase("en")
    .replace(PUNCT, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface CatalogEntry {
  id: string;
  title: string;
  author: string | null;
}

/** Existing titles the new entry duplicates, exact title key first. */
export function findDuplicates<T extends CatalogEntry>(candidate: { title: string; author?: string | null }, books: readonly T[]): T[] {
  const title = titleKey(candidate.title);
  if (!title) return [];
  const author = titleKey(candidate.author);
  return books.filter((b) => {
    if (titleKey(b.title) !== title) return false;
    const other = titleKey(b.author);
    return !author || !other || author === other;
  });
}
