import clsx from 'clsx'
import defaultLogo from '../assets/logo.webp'
import { useSettings } from '../hooks/queries'

/** Uses the uploaded logo from Settings when available, otherwise the bundled one. */
export default function Logo({ className }) {
  const { data } = useSettings()
  return <img src={data?.logo_url || defaultLogo} alt="Sanj Garva" className={clsx('shrink-0 object-contain drop-shadow-md', className)} />
}
