"use client"

import { inputClass, labelClass } from "./ui"

interface RangeFieldProps {
    id: string
    label: string
    display: string
    value: number
    min: number
    max: number
    step: number
    onChange: (value: number) => void
}

export function RangeField({ id, label, display, value, min, max, step, onChange }: RangeFieldProps) {
    return (
        <div>
            <label className={labelClass} htmlFor={id}>
                {label} · {display}
            </label>
            <input
                id={id}
                type="range"
                min={min}
                max={max}
                step={step}
                value={Math.min(max, Math.max(min, value))}
                onChange={(event) => onChange(Number(event.target.value))}
                className="w-full accent-black"
            />
        </div>
    )
}

interface NumberFieldProps {
    id: string
    label: string
    value: number
    min: number
    max: number
    step?: number
    onChange: (value: number) => void
}

export function NumberField({ id, label, value, min, max, step = 0.1, onChange }: NumberFieldProps) {
    return (
        <div>
            <label className={labelClass} htmlFor={id}>
                {label} · {Number(value.toFixed(2))}%
            </label>
            <input
                id={id}
                type="number"
                min={min}
                max={max}
                step={step}
                value={Number(value.toFixed(2))}
                onChange={(event) => onChange(Math.min(max, Math.max(min, Number(event.target.value) || 0)))}
                className={inputClass}
            />
        </div>
    )
}

interface ChoiceButtonsProps<T extends string | number> {
    label: string
    value: T
    options: { value: T; label: string }[]
    onChange: (value: T) => void
}

/** A row of buttons of which exactly one is on. */
export function ChoiceButtons<T extends string | number>({ label, value, options, onChange }: ChoiceButtonsProps<T>) {
    return (
        <div>
            <span className={labelClass}>{label}</span>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
                {options.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={value === option.value}
                        onClick={() => onChange(option.value)}
                        className={`px-2 py-2 border-3 border-black font-black uppercase text-[11px] transition-all ${value === option.value ? "bg-neo-yellow" : "bg-white hover:bg-neo-yellow"
                            }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    )
}