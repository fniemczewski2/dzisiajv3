// components/news/NewsSourcesPanel.tsx

import React, { useId, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { MAX_CUSTOM_FEEDS, RSS_GROUPS, RSS_SOURCES, type CustomFeed } from "@/config/rssSources";
import { checkCustomFeed } from "@/hooks/useNews";
import { AddButton, FormButtons } from "../ui/CommonButtons";

interface Props {
  enabled: string[];
  custom: CustomFeed[];
  status: Record<string, string | null>;
  saving: boolean;
  onSave: (enabled: string[], custom: CustomFeed[]) => void;
  onClose: () => void;
}

function StatusIcon({ state }: Readonly<{ state: string | null | undefined }>) {
  if (state === undefined) return null;
  if (state === null) {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-label="Pobrano" />;
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm text-danger" title={state}>
      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
    </span>
  );
}

export default function NewsSourcesPanel({ enabled, custom, status, saving, onSave, onClose }: Readonly<Props>) {
  const id = useId();
  const [selected, setSelected] = useState<Set<string>>(new Set(enabled));
  const [feeds, setFeeds] = useState<CustomFeed[]>(custom);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState<{ ok: boolean; message: string } | null>(null);

  const toggle = (sid: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });

  const setGroup = (ids: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((x) => (on ? next.add(x) : next.delete(x)));
      return next;
    });

  const addFeed = async () => {
    setChecking(true);
    setCheckMsg(null);
    const result = await checkCustomFeed(url.trim());
    setChecking(false);
    setCheckMsg(result);
    if (!result.ok) return;
    const feed: CustomFeed = {
      id: `c_${Date.now().toString(36)}`,
      name: name.trim() || new URL(url).hostname,
      url: url.trim(),
    };
    setFeeds((f) => [...f, feed]);
    setSelected((s) => new Set(s).add(feed.id));
    setName("");
    setUrl("");
  };

  return (
    <section aria-labelledby={`${id}-h`} className="form-card max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <h2 id={`${id}-h`} className="section-title">
          Źródła wiadomości
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Zamknij źródła"
          className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <p className="text-sm text-text-secondary">
        Wybrano {selected.size}. Status pobrania pokazuje się po odświeżeniu listy.
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        {RSS_GROUPS.map((group) => {
          const sources = RSS_SOURCES.filter((s) => s.group === group);
          const ids = sources.map((s) => s.id);
          const allOn = ids.every((x) => selected.has(x));
          return (
            <fieldset key={group}>
              <legend className="flex w-full items-center justify-between gap-2 text-sm font-semibold text-text">
                {group}
                <button
                  type="button"
                  onClick={() => setGroup(ids, !allOn)}
                  className="min-h-11 px-2 text-sm font-medium text-primary hover:underline"
                >
                  {allOn ? "Odznacz grupę" : "Zaznacz grupę"}
                </button>
              </legend>
              {sources.map((s) => (
                <div key={s.id} className="flex min-h-11 items-center gap-3">
                  <input
                    id={`${id}-${s.id}`}
                    type="checkbox"
                    className="h-5 w-5 shrink-0"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                  />
                  <label htmlFor={`${id}-${s.id}`} className="flex-1 cursor-pointer text-text">
                    {s.name}
                    {s.lang === "en" && <span className="ml-1.5 text-sm text-text-secondary">(EN)</span>}
                  </label>
                  {selected.has(s.id) && <StatusIcon state={status[s.id]} />}
                </div>
              ))}
            </fieldset>
          );
        })}

        <fieldset>
          <legend className="text-sm font-semibold text-text">
            Własne kanały ({feeds.length}/{MAX_CUSTOM_FEEDS})
          </legend>
          {feeds.map((f) => (
            <div key={f.id} className="flex min-h-11 items-center gap-3">
              <input
                id={`${id}-${f.id}`}
                type="checkbox"
                className="h-5 w-5 shrink-0"
                checked={selected.has(f.id)}
                onChange={() => toggle(f.id)}
              />
              <label
                htmlFor={`${id}-${f.id}`}
                className="min-w-0 flex-1 cursor-pointer truncate text-text"
                title={f.url}
              >
                {f.name}
              </label>
              {selected.has(f.id) && <StatusIcon state={status[f.id]} />}
              <button
                type="button"
                onClick={() => setFeeds((all) => all.filter((x) => x.id !== f.id))}
                aria-label={`Usuń kanał ${f.name}`}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary hover:bg-surface"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          {feeds.length < MAX_CUSTOM_FEEDS && (
            <div className="mt-2 space-y-2">
              <label htmlFor={`${id}-url`} className="form-label">
                Adres kanału RSS lub Atom:
              </label>
              <input
                id={`${id}-url`}
                type="url"
                inputMode="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…/feed/"
                className="input-field"
              />
              <label htmlFor={`${id}-name`} className="form-label">
                Nazwa (opcjonalnie):
              </label>
              <input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
              <AddButton onClick={() => void addFeed()} disabled={checking || !/^https?:\/\//i.test(url.trim())} />
              {checkMsg && (
                <output className={`block text-sm ${checkMsg.ok ? "text-success" : "text-danger"}`}>
                  {checkMsg.message}
                </output>
              )}
            </div>
          )}
        </fieldset>
      </div>
      <FormButtons onClickSave={() => onSave([...selected], feeds)} onClickClose={() => onClose()} loading={saving} />
    </section>
  );
}
