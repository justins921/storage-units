'use client';

import { useState, useTransition } from 'react';
import { Button, Textarea } from '@/lib/ui';
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
    <div className="mt-3 space-y-3">
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300"
          />
          Enabled
        </label>
        <div className="flex items-center gap-2">
          {done ? (
            <span className="text-xs font-medium text-emerald-700">{done}</span>
          ) : null}
          {error ? <span className="text-xs text-red-600">{error}</span> : null}
          <Button size="sm" onClick={submit} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
