import { DpnTester } from '@/components/dev/DpnTester';
import Link from 'next/link';

export default function DevToolsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-2xl mx-auto mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold uppercase tracking-widest text-red-500">IDA Engineering</h1>
        <Link href="/arena" className="text-sm font-mono opacity-50 hover:text-white">← Back to Arena</Link>
      </div>
      <DpnTester />
    </div>
  );
}
