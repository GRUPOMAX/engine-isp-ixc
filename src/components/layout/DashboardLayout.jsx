import { Moon, SunMedium } from 'lucide-react';
import { useEffect, useState } from 'react';
import clsx from 'clsx';


export default function DashboardLayout({ children }) {
const [dark, setDark] = useState(true);
useEffect(() => {
document.documentElement.classList.toggle('dark', dark);
}, [dark]);


return (
<div className={clsx('min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100')}
>
<header className="border-b border-neutral-200 dark:border-neutral-800">
<div className="container flex items-center justify-between py-3">
<h1 className="text-base font-semibold">Front ISP Dashboard</h1>
<div className="flex items-center gap-2">
<button className="btn" onClick={() => setDark((v) => !v)}>
{dark ? <SunMedium size={16}/> : <Moon size={16}/>}
<span className="hidden sm:inline">Tema</span>
</button>
</div>
</div>
</header>


<main className="container py-6">
{children}
</main>
</div>
);
}