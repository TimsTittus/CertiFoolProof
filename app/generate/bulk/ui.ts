/** Shared neo-brutalist class names for the bulk generator screens. */

export const inputClass =
    "w-full px-3 py-2 border-3 border-black bg-white text-black font-bold text-sm placeholder-black/30 focus:outline-none focus:bg-neo-yellow transition-all disabled:opacity-50"
export const labelClass = "block text-[11px] font-black uppercase tracking-tighter text-black mb-1.5"
export const cardClass = "border-3 border-black bg-white p-5 sm:p-6 shadow-neo"
export const buttonClass =
    "px-5 py-3 border-3 border-black font-black uppercase italic text-sm shadow-neo transition-all hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-neo disabled:hover:translate-x-0 disabled:hover:translate-y-0"
export const smallButtonClass =
    "px-3 py-2 border-3 border-black bg-white font-black uppercase text-[11px] shadow-neo transition-all hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-neo disabled:hover:translate-x-0 disabled:hover:translate-y-0"
export const checkboxClass = "w-5 h-5 border-3 border-black accent-black"

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
