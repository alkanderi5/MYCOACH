"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import styles from "./browse.module.css";

export function SearchBar({
  initial = "",
  action = "/library",
}: {
  initial?: string;
  action?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = value.trim();
    router.push(term ? `${action}?q=${encodeURIComponent(term)}` : action);
  }

  return (
    <form className={styles.searchForm} onSubmit={handleSubmit} role="search">
      <span className={styles.searchIcon} aria-hidden="true">
        <MagnifyingGlass size={18} />
      </span>
      <input
        className={styles.searchInput}
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="What do you want to practise?"
        aria-label="Search drills"
      />
      {value && (
        <button
          type="button"
          className={styles.searchClear}
          onClick={() => {
            setValue("");
            router.push(action);
          }}
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
    </form>
  );
}
