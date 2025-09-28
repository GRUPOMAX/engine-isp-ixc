import HealthCard from '@/components/Cards/HealthCard';
import HeartbeatCard from '@/components/Cards/HeartbeatCard';
import EventLog from '@/components/EventLog';
import RefreshCard from '@/components/RefreshCard';


export default function DashboardHome() {
return (
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
<div className="sm:col-span-1"><HealthCard/></div>
<div className="sm:col-span-1"><HeartbeatCard/></div>
<div className="lg:col-span-1"><RefreshCard/></div>
<div className="sm:col-span-2 lg:col-span-3"><EventLog/></div>
</div>
);
}