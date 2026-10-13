import type { BrowserStep } from '../../types/api';

interface Props { steps: BrowserStep[]; onChange: (steps: BrowserStep[]) => void; }
export function BrowserStepsEditor({ steps, onChange }: Props) {
  const update = (index: number, patch: Partial<BrowserStep>) => onChange(steps.map((s, i) => i === index ? { ...s, ...patch } : s));
  return <details className="border border-line rounded p-3">
    <summary className="cursor-pointer text-sm font-medium">Browser interactions ({steps.length})</summary>
    <p className="text-xs text-muted-ink mt-2">Add steps only when the page needs search, expansion or pagination. Saving creates a new draft; preview, approve and validate it before reuse. Login, MFA and site changes are human-only.</p>
    <div className="space-y-3 mt-3">{steps.map((step, index) => <fieldset key={index} className="border border-line rounded p-3 space-y-2">
      <legend className="text-xs px-1">Step {index + 1}</legend>
      <label className="block text-xs">Action {index + 1}<select value={step.action} onChange={e => update(index, { action: e.target.value as BrowserStep['action'] })} className="block w-full border border-line rounded p-2 mt-1">
        <option value="click">Click or expand</option><option value="wait">Wait for content</option><option value="fill">Fill search field</option><option value="select">Choose filter option</option><option value="scroll">Scroll page</option>
      </select></label>
      {step.action === 'scroll' ? <label className="block text-xs">Scroll distance {index + 1}<input type="number" min={-900} max={900} value={step.pixels ?? 600} onChange={e => update(index, { pixels: Number(e.target.value) })} className="block w-full border border-line rounded p-2 mt-1" /></label> :
        <label className="block text-xs">Target selector {index + 1}<input required maxLength={500} value={step.selector || ''} onChange={e => update(index, { selector: e.target.value })} placeholder="#load-more" className="block w-full border border-line rounded p-2 mt-1" /></label>}
      {['fill', 'select'].includes(step.action) && <label className="block text-xs">Search or filter value {index + 1}<input maxLength={1000} value={step.text || ''} onChange={e => update(index, { text: e.target.value })} className="block w-full border border-line rounded p-2 mt-1" /><span className="text-muted-ink">Saved with this recipe. Never enter passwords, codes or personal secrets.</span></label>}
      <button type="button" onClick={() => onChange(steps.filter((_, i) => i !== index))} className="text-xs underline">Remove step {index + 1}</button>
    </fieldset>)}</div>
    <button type="button" disabled={steps.length >= 20} onClick={() => onChange([...steps, { action: 'click', selector: '' }])} className="mt-3 px-3 py-2 border border-line rounded text-xs">Add browser step</button>
  </details>;
}
