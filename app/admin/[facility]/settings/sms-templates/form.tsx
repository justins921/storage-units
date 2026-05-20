'use client';

import { useState, useTransition } from 'react';
import { saveSmsTemplate } from './actions';

interface Props {
  facilitySlug: string;
  templateKey: string;
  initialBody: string;
  initialEnabled: boolean;
}

export function SmsTemplateForm(props: Props) {
  const [body, setBody] = useState(props.initialBody);
  const [enabled, setEnabled] = useState(props.initialEnabled);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setDone(null);
    startTransition(async () => {
      const res = await saveSmsTemplate({
        facilitySlug: props.facilitySlug,
        key: props.templateKey,
        body,
        enabled,
      });
      if (res?.error) setError(res.error);
      else setDone('saved');
    });
  }

  return (
    <div className="mt-3 space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
      />
      <div className="flex items-center justify-between text-xs">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Enabled
        </label>
        <div className="flex items-center gap-3">
          {done ? <span className="text-emerald-700">{done}</span> : null}
          {error ? <span className="text-red-600">{error}</span> : null}
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="rounded bg-gray-900 px-3 py-1 text-white disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
