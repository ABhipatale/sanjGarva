import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary: 'bg-linear-to-b from-brand-600 to-brand-700 text-white shadow-sm hover:from-brand-500 hover:to-brand-700 active:from-brand-700',
  secondary: 'bg-white text-slate-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 active:bg-slate-100',
  soft: 'bg-brand-50 text-brand-800 hover:bg-brand-100 active:bg-brand-200',
  ghost: 'text-slate-700 hover:bg-slate-100 active:bg-slate-200',
  danger: 'bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700',
  success: 'bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700',
  gold: 'bg-linear-to-b from-gold-300 to-gold-500 text-brand-950 hover:from-gold-300 hover:to-gold-400',
}

const SIZES = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-4 text-[15px] gap-2 rounded-xl',
  lg: 'h-13 px-5 text-base gap-2 rounded-2xl',
  xl: 'h-15 px-6 text-lg gap-2.5 rounded-2xl',
  icon: 'size-11 rounded-xl',
}

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, className, to, children, icon: Icon, block, type = 'button', ...props },
  ref,
) {
  const classes = clsx(
    'inline-flex select-none items-center justify-center font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    block && 'w-full',
    className,
  )
  const content = (
    <>
      {loading ? <Loader2 className="size-5 animate-spin" aria-hidden /> : Icon ? <Icon className="size-5 shrink-0" aria-hidden /> : null}
      {children}
    </>
  )

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {content}
      </Link>
    )
  }
  return (
    <button ref={ref} type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {content}
    </button>
  )
})

export default Button
