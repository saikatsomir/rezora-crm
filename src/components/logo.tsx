/* eslint-disable @next/next/no-img-element */
export function Logo({ className = "h-7" }: { className?: string }) {
  return (<>
    <img src="/logo-blue.png" alt="Rezora" className={`${className} w-auto dark:hidden`} />
    <img src="/logo-white.png" alt="Rezora" className={`${className} w-auto hidden dark:block`} />
  </>);
}
